# Database Backups

This directory contains scripts for PostgreSQL database backup and restore operations.

## Setup

Ensure your `.env` file in the project's root directory contains the `DB_CONNECTION_STRING` variable for connecting to the database.

## Usage

### `backup_db.sh [VERSION]`

This script creates a database snapshot.

-   It determines a `VERSION` for the snapshot based on:
    1.  An optional argument passed to the script.
    2.  The Docker image tag of a running `magazyn-backend` container.
    3.  The current git tag (as a fallback).
-   A new directory is created at `snapshots/<VERSION>/<TIMESTAMP>/`.
-   It dumps the `public` and `supabase_migrations` schemas (without privileges) into `public-rollback.sql`. This file is used for schema restoration before applying new migrations.
-   It dumps the `public` and `auth` schemas (with privileges) into `public-auth.sql`. This file can be used for manual data recovery if the `auth` schema is corrupted.
-   The script retains the 10 most recent snapshots for each version, automatically cleaning up older ones.

**Example:**
```bash
./backup_db.sh
# Creates a snapshot in `snapshots/<VERSION>/<TIMESTAMP>/`
```

### `restore_db.sh <PATH_TO_SNAPSHOT>`

This script restores the database to a specified snapshot.

-   It takes the full path to a snapshot directory (e.g., `snapshots/v1.0.0/20240212-123456/`) as an argument.
-   **WARNING: This operation will OVERWRITE the current database.** The script will prompt for confirmation before proceeding.
-   It first executes `clear_schemas.sql` to drop objects from the `supabase_migrations` and `public` schemas, preparing them for a fresh restore.
-   Then, it applies the `public-rollback.sql` from the specified snapshot to restore the schema.
-   After restoration, it checks out the git `VERSION` corresponding to the snapshot and brings up `docker compose`.

**Example:**
```bash
./restore_db.sh snapshots/v1.0.0/20240212-123456/
```

### `clear_schemas.sql`

This SQL script defines and executes a function `reset_schema_owned_objects` that safely drops all views, materialized views, tables, sequences, types, and functions/procedures within the `supabase_migrations` and `public` schemas. It includes safety checks to prevent accidental clearing of protected schemas. This script is primarily used by `restore_db.sh` to prepare the database schemas for a clean restoration.
