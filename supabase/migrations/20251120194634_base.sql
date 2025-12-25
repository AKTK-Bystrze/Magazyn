-- Migration: Base Schema
-- Description: Extensions, Enums, Tables, Indexes, and Helper Functions

-- EXTENSIONS (in dedicated schema to avoid public schema pollution)
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA extensions;

-- ENUMS
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE reservation_status AS ENUM ('PENDING', 'RENTED', 'RETURNED', 'DENIED');
CREATE TYPE equipment_status AS ENUM ('ok', 'broken', 'blocked');
CREATE TYPE credit_request_status AS ENUM ('PENDING', 'APPROVED', 'DENIED');
CREATE TYPE credit_transaction_reason AS ENUM ('reservation_charge', 'reservation_refund', 'reservation_adjustment', 'admin_adjustment', 'work_credit');

-- TABLES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  credit_balance INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  credit_cost_per_day INTEGER NOT NULL CHECK (credit_cost_per_day >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_id TEXT NOT NULL,
  type_id UUID NOT NULL REFERENCES equipment_types(id),
  name TEXT,
  description TEXT,
  status equipment_status NOT NULL DEFAULT 'ok',
  image_path TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (type_id, internal_id)
);
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CHECK (end_date >= start_date)
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

ALTER TABLE reservations
ADD CONSTRAINT reservations_equipment_id_overlap_v2_excl
EXCLUDE USING gist (
  equipment_id WITH =,
  daterange(start_date, end_date, '[]') WITH &&
)
WHERE (status IN ('PENDING', 'RENTED'));

CREATE TABLE credit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL,
  reason credit_transaction_reason NOT NULL,
  description TEXT,
  reservation_id UUID REFERENCES reservations(id),
  author_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;

CREATE TABLE credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  status credit_request_status NOT NULL DEFAULT 'PENDING',
  admin_id UUID REFERENCES profiles(id),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE credit_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  previous_status equipment_status,
  new_status equipment_status NOT NULL,
  notes TEXT,
  admin_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE reservation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status reservation_status NOT NULL,
  changed_by_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE reservation_history ENABLE ROW LEVEL SECURITY;

-- INDEXES
CREATE INDEX reservations_user_id_start_date_idx ON reservations (user_id, start_date);
CREATE INDEX reservations_equipment_id_start_date_idx ON reservations (equipment_id, start_date);
CREATE INDEX reservations_status_idx ON reservations (status);
CREATE INDEX equipment_status_idx ON equipment (status);
CREATE INDEX profiles_username_idx ON profiles (username);
CREATE INDEX profiles_email_idx ON profiles (email);
CREATE INDEX profiles_is_enabled_idx ON profiles (is_enabled);
CREATE INDEX reservations_user_equipment_idx ON reservations (user_id, equipment_id);
CREATE INDEX reservation_history_reservation_id_created_at_idx ON reservation_history (reservation_id, created_at);
CREATE INDEX credit_history_user_id_idx ON credit_history (user_id);
CREATE INDEX credit_history_reservation_id_idx ON credit_history (reservation_id);
CREATE INDEX maintenance_logs_equipment_id_idx ON maintenance_logs (equipment_id);

-- HELPER FUNCTIONS (for RLS policies - must be after tables are created)
-- Check if current user is enabled
CREATE OR REPLACE FUNCTION public.is_enabled()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_enabled FROM profiles WHERE id = auth.uid()), false);
$$;

-- Check if current user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'));
$$;

-- Check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $body$
DECLARE user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value FROM profiles WHERE id = auth.uid();
  RETURN user_role_value;
END; $body$;
