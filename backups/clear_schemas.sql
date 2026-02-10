CREATE OR REPLACE FUNCTION reset_schema_owned_objects(
  target_schema text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  obj RECORD;
BEGIN
  ------------------------------------------------------------------
  -- Safety checks
  ------------------------------------------------------------------
  IF target_schema IN (
    'pg_catalog',
    'information_schema',
    'auth',
    'storage',
    'realtime',
    'extensions',
    'supabase_functions'
  ) THEN
    RAISE EXCEPTION 'Refusing to reset protected schema: %', target_schema;
  END IF;

  ------------------------------------------------------------------
  -- 1. Views & materialized views
  ------------------------------------------------------------------
  FOR obj IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = target_schema
      AND c.relkind IN ('v', 'm')
      AND r.rolname = current_user
  LOOP
    EXECUTE format(
      'DROP %s IF EXISTS %I.%I CASCADE',
      CASE obj.relkind WHEN 'v' THEN 'VIEW' ELSE 'MATERIALIZED VIEW' END,
      target_schema,
      obj.relname
    );
  END LOOP;

  ------------------------------------------------------------------
  -- 2. Tables (incl. partitions)
  ------------------------------------------------------------------
  FOR obj IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = target_schema
      AND c.relkind IN ('r', 'p')
      AND r.rolname = current_user
  LOOP
    EXECUTE format(
      'DROP TABLE IF EXISTS %I.%I CASCADE',
      target_schema,
      obj.relname
    );
  END LOOP;

  ------------------------------------------------------------------
  -- 3. Sequences (standalone)
  ------------------------------------------------------------------
  FOR obj IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = c.relowner
    WHERE n.nspname = target_schema
      AND c.relkind = 'S'
      AND r.rolname = current_user
  LOOP
    EXECUTE format(
      'DROP SEQUENCE IF EXISTS %I.%I CASCADE',
      target_schema,
      obj.relname
    );
  END LOOP;

  ------------------------------------------------------------------
  -- 4. Types (enums, domains, composites)
  ------------------------------------------------------------------
  FOR obj IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_roles r ON r.oid = t.typowner
    WHERE n.nspname = target_schema
      AND t.typtype IN ('e', 'd', 'c')
      AND r.rolname = current_user
  LOOP
    EXECUTE format(
      'DROP TYPE IF EXISTS %I.%I CASCADE',
      target_schema,
      obj.typname
    );
  END LOOP;

  ------------------------------------------------------------------
  -- 5. Functions & procedures
  ------------------------------------------------------------------
  FOR obj IN
    SELECT
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    WHERE n.nspname = target_schema
      AND r.rolname = current_user
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      target_schema,
      obj.proname,
      obj.args
    );
  END LOOP;

END
$$;

SELECT reset_schema_owned_objects('supabase_migrations');
SELECT reset_schema_owned_objects('public');
