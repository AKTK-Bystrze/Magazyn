# Database Backups

This directory provides scripts for creating and restoring PostgreSQL database snapshots.

## Configuration

Set the `DB_CONNECTION_STRING` in your project's root `.env` file:

```env
DB_CONNECTION_STRING="postgresql://user:password@host:port/dbname"
```

## Usage

### `backup_db.sh [VERSION]`

Creates a versioned database snapshot. The `VERSION` is determined by the argument, a running `magazyn-backend` container's Docker image tag, or the current `git` tag. Snapshots include `public` and `auth` schema dumps, stored in `snapshots/<VERSION>/<TIMESTAMP>/`. The script retains the 10 most recent snapshots per version.

**Example:**

```bash
# Creates a snapshot
./backup_db.sh
```

### `restore_db.sh <PATH_TO_SNAPSHOT>`

Restores the database from a specified snapshot.

> **WARNING:** This is a destructive operation and will **overwrite** the current database. Confirmation is required.

It clears existing schemas, applies the snapshot's `public-rollback.sql`, checks out the corresponding `git` tag, and restarts services.

**Example:**

```bash
# Restores the database from a snapshot
./restore_db.sh snapshots/v1.0.0/20240212-123456/
```

### `clear_schemas.sql`

Internal SQL script used by `restore_db.sh` to safely drop all objects in `public` and `supabase_migrations` schemas, ensuring a clean state for restoration.
