-- Migration: Initial Schema
-- Description: Sets up the initial database schema for the Equipment Rental System.
-- Includes enums, tables, indexes, RLS policies, triggers, and views.

-- 1. Extensions
create extension if not exists "btree_gist";

-- 2. Enums
create type user_role as enum (
  'user',
  'admin',
  'super_admin'
);

create type reservation_status as enum (
  'PENDING',
  'RENTED',
  'RETURNED',
  'DENIED'
);

create type equipment_status as enum (
  'ok',
  'broken',
  'blocked'
);

create type credit_request_status as enum (
  'PENDING',
  'APPROVED',
  'DENIED'
);

create type credit_transaction_reason as enum (
  'reservation_charge',
  'reservation_refund',
  'reservation_adjustment',
  'admin_adjustment',
  'work_credit'
);

-- 3. Tables

-- Table: profiles
-- Description: Public profile table extending auth.users.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  role user_role not null default 'user',
  credit_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table profiles enable row level security;

-- Table: equipment_types
-- Description: Categories of equipment with standardized pricing.
create table equipment_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  credit_cost_per_day integer not null check (credit_cost_per_day >= 0),
  created_at timestamptz not null default now()
);

alter table equipment_types enable row level security;

-- Table: equipment
-- Description: Individual physical items available for rent.
create table equipment (
  id uuid primary key default gen_random_uuid(),
  internal_id text not null,
  type_id uuid not null references equipment_types(id),
  name text,
  description text,
  status equipment_status not null default 'ok',
  image_path text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (type_id, internal_id)
);

alter table equipment enable row level security;

-- Table: reservations
-- Description: Booking records linking users to equipment for specific dates.
create table reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete restrict,
  equipment_id uuid not null references equipment(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  status reservation_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  check (end_date >= start_date),
  exclude using gist (equipment_id with =, daterange(start_date, end_date, '[]') with &&)
);

alter table reservations enable row level security;

-- Table: credit_history
-- Description: Immutable ledger of all credit transactions.
create table credit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount integer not null,
  reason credit_transaction_reason not null,
  description text,
  reservation_id uuid references reservations(id),
  admin_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table credit_history enable row level security;

-- Table: credit_requests
-- Description: Requests for credits (e.g., for volunteer work) requiring approval.
create table credit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  amount integer not null check (amount > 0),
  description text not null,
  status credit_request_status not null default 'PENDING',
  admin_id uuid references profiles(id),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table credit_requests enable row level security;

-- Table: maintenance_logs
-- Description: Audit trail for equipment status changes.
create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references equipment(id),
  previous_status equipment_status,
  new_status equipment_status not null,
  notes text,
  admin_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table maintenance_logs enable row level security;

-- Table: reservation_history
-- Description: Audit trail for all reservation changes (insert-only).
create table reservation_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id),
  user_id uuid not null references profiles(id),
  equipment_id uuid not null references equipment(id),
  start_date date not null,
  end_date date not null,
  status reservation_status not null,
  changed_by_user_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table reservation_history enable row level security;

-- 4. Indexes

-- Reservations indexes
create index reservations_user_id_start_date_idx on reservations (user_id, start_date);
create index reservations_equipment_id_start_date_idx on reservations (equipment_id, start_date);
create index reservations_status_idx on reservations (status);

-- Equipment indexes
create index equipment_status_idx on equipment (status);

-- Profiles indexes
create index profiles_username_idx on profiles (username);
create index profiles_email_idx on profiles (email);

-- Analytics / Favorites index
create index reservations_user_equipment_idx on reservations (user_id, equipment_id);

-- Reservation History indexes
create index reservation_history_reservation_id_created_at_idx on reservation_history (reservation_id, created_at);


-- 5. Row Level Security (RLS) Policies

-- Profiles Policies
-- Select: Users can see their own profile. Admins/SuperAdmins can see all.
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Update: Admins/SuperAdmins can update any profile. Users cannot update their own.
create policy "Admins can update any profile"
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Equipment Types Policies
-- Select: Public access
create policy "Public can view equipment types"
  on equipment_types for select
  using (true);

-- Insert/Update/Delete: Admins/SuperAdmins only
create policy "Admins can insert equipment types"
  on equipment_types for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update equipment types"
  on equipment_types for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can delete equipment types"
  on equipment_types for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );


-- Equipment Policies
-- Select: Public access
create policy "Public can view equipment"
  on equipment for select
  using (true);

-- Insert/Update/Delete: Admins/SuperAdmins only
create policy "Admins can insert equipment"
  on equipment for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update equipment"
  on equipment for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can delete equipment"
  on equipment for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Reservations Policies
-- Select: Users can see their own. Admins/SuperAdmins can see all.
create policy "Users can view own reservations"
  on reservations for select
  using (auth.uid() = user_id);

create policy "Admins can view all reservations"
  on reservations for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Insert: Users can insert for themselves. Admins can insert for any user.
create policy "Users can insert own reservations"
  on reservations for insert
  with check (auth.uid() = user_id);

create policy "Admins can insert reservations"
  on reservations for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Update: Users can update own if PENDING. Admins can update any.
create policy "Users can update own pending reservations"
  on reservations for update
  using (auth.uid() = user_id and status = 'PENDING');

create policy "Admins can update any reservation"
  on reservations for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Credit History Policies
-- Select: Users can see their own. Admins/SuperAdmins can see all.
create policy "Users can view own credit history"
  on credit_history for select
  using (auth.uid() = user_id);

create policy "Admins can view all credit history"
  on credit_history for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Insert: System/Admin only (No public insert policy needed as this is usually handled by backend/triggers, but we can add admin insert for manual adjustments)
create policy "Admins can insert credit history"
  on credit_history for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Credit Requests Policies
-- Select: Users can see their own. Admins/SuperAdmins can see all.
create policy "Users can view own credit requests"
  on credit_requests for select
  using (auth.uid() = user_id);

create policy "Admins can view all credit requests"
  on credit_requests for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Insert: Users can create requests.
create policy "Users can create credit requests"
  on credit_requests for insert
  with check (auth.uid() = user_id);

-- Update: SuperAdmins only (approve/deny).
create policy "SuperAdmins can update credit requests"
  on credit_requests for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Maintenance Logs Policies
-- Select: Admins/SuperAdmins only.
create policy "Admins can view maintenance logs"
  on maintenance_logs for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Insert: Admins/SuperAdmins only (or via trigger)
create policy "Admins can insert maintenance logs"
  on maintenance_logs for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Reservation History Policies
-- Select: Users can see their own reservation history. Admins/SuperAdmins can see all.
create policy "Users can view own reservation history"
  on reservation_history for select
  using (
    exists (
      select 1 from reservations
      where id = reservation_history.reservation_id and user_id = auth.uid()
    )
  );

create policy "Admins can view all reservation history"
  on reservation_history for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Insert: System via trigger or Admins for manual adjustments
create policy "Admins can insert reservation history"
  on reservation_history for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- 6. Functions and Triggers

-- Function: update_updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: update_updated_at for profiles
create trigger update_profiles_updated_at
before update on profiles
for each row execute procedure update_updated_at();

-- Trigger: update_updated_at for equipment
create trigger update_equipment_updated_at
before update on equipment
for each row execute procedure update_updated_at();

-- Trigger: update_updated_at for reservations
create trigger update_reservations_updated_at
before update on reservations
for each row execute procedure update_updated_at();

-- Trigger: update_updated_at for credit_requests
create trigger update_credit_requests_updated_at
before update on credit_requests
for each row execute procedure update_updated_at();

-- Function: handle_new_user
-- Description: Automatically create a profile for new auth users.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: on_auth_user_created
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Function: log_maintenance_change
-- Description: Logs changes to equipment status.
create or replace function log_maintenance_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into maintenance_logs (equipment_id, previous_status, new_status, admin_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: log_equipment_status_change
create trigger log_equipment_status_change
after update on equipment
for each row execute procedure log_maintenance_change();

-- Function: log_reservation_change
-- Description: Logs all reservation changes (inserts and updates) to audit table.
create or replace function log_reservation_change()
returns trigger as $$
begin
  insert into reservation_history (
    reservation_id,
    user_id,
    equipment_id,
    start_date,
    end_date,
    status,
    changed_by_user_id
  ) values (
    new.id,
    new.user_id,
    new.equipment_id,
    new.start_date,
    new.end_date,
    new.status,
    auth.uid()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: log_reservation_changes
create trigger log_reservation_changes
after insert or update on reservations
for each row execute procedure log_reservation_change();

-- 7. Views

-- View: analytics_equipment_stats
create or replace view analytics_equipment_stats as
select
  e.id as equipment_id,
  e.name as equipment_name,
  count(r.id) as total_reservations,
  coalesce(sum(r.end_date - r.start_date), 0) as total_days_rented,
  case
    when count(r.id) > 0 then
      (cast(sum(r.end_date - r.start_date) as float) / greatest(1, (current_date - date(e.created_at))))
    else 0
  end as utilization_rate
from equipment e
left join reservations r on e.id = r.equipment_id and r.status = 'RETURNED'
group by e.id, e.name;

-- View: analytics_user_stats
create or replace view analytics_user_stats as
select
  p.id as user_id,
  p.username,
  count(r.id) as total_reservations,
  coalesce(sum(case when ch.amount < 0 then abs(ch.amount) else 0 end), 0) as total_credits_spent,
  max(r.created_at) as last_reservation_date
from profiles p
left join reservations r on p.id = r.user_id
left join credit_history ch on p.id = ch.user_id
group by p.id, p.username;

-- 8. Realtime
-- Enable Realtime for specific tables
alter publication supabase_realtime add table reservations;
alter publication supabase_realtime add table equipment;
