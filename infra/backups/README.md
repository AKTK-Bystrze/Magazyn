# Database Backups

This directory provides scripts for creating and restoring PostgreSQL database snapshots.

## Prerequisites

Before using these scripts, ensure the following tools are installed and available in your environment:

-   `docker` & `docker-compose`
-   `git`

## Configuration

The scripts require a database connection string to interact with the PostgreSQL server.

1.  **Create an `.env` file** in the project's root directory if you don't have one.
2.  **Add the `DB_CONNECTION_STRING`** variable to your `.env` file:

    ```env
    DB_CONNECTION_STRING="postgresql://user:password@host:port/dbname"
    ```
---

## Usage

### `backup_db.sh [VERSION]`

This script creates a versioned snapshot of the database.

**How it works:**

1.  **Versioning:** The script determines a `VERSION` for the snapshot from one of these sources, in order of preference:
    1.  The optional `[VERSION]` argument passed to the script.
    2.  The Docker image tag of a running `magazyn-backend` container.
    3.  The current `git` tag (as a fallback).
2.  **Snapshot Creation:** A new directory is created at `snapshots/<VERSION>/<TIMESTAMP>/`.
3.  **Schema Dumps:**
    -   `public-rollback.sql`: A dump of the `public` and `supabase_migrations` schemas. This is used to restore the database schema to a state before applying new migrations.
    -   `public-auth.sql`: A privileged dump of the `public` and `auth` schemas. This can be used for manual data recovery.
4.  **Cleanup:** The script retains the 10 most recent snapshots for each version and automatically cleans up older ones.

**Example:**

```bash
# Creates a snapshot in snapshots/<VERSION>/<TIMESTAMP>/
./backup_db.sh
```

### `restore_db.sh <PATH_TO_SNAPSHOT>`

This script restores the database to a specific point in time using a previously created snapshot.

> **WARNING:** This is a destructive operation and will **overwrite** the current database. The script will require confirmation before proceeding.

**How it works:**

1.  **Clear Schemas:** The script first runs `clear_schemas.sql` to drop all objects from the `public` and `supabase_migrations` schemas, preparing for a clean restore.
2.  **Restore Schema:** It applies the `public-rollback.sql` from the specified snapshot directory to restore the database schema.
3.  **Checkout Version:** After restoring, the script checks out the `git` tag corresponding to the snapshot's `VERSION`. This aligns the codebase with the database state.
4.  **Start Services:** Finally, it brings up the services using `docker-compose`.

**Example:**

```bash
# Restores the database using the specified snapshot
./restore_db.sh snapshots/v1.0.0/20240212-123456/
```

### `clear_schemas.sql`

This is an internal SQL script used by `restore_db.sh`. It contains a function that safely drops all objects (tables, views, functions, etc.) within the `public` and `supabase_migrations` schemas to ensure a clean state before a restore operation.
