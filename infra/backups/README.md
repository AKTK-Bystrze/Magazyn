# Database Backups

This directory provides scripts for creating and restoring PostgreSQL database snapshots. 
The backup script now uses a time-based rotation schedule instead of versioning to align with industry standards, and leverages the host `cron` daemon.

## Configuration

Set the `DB_CONNECTION_STRING` in your project's root `.env` file:

```env
DB_CONNECTION_STRING="postgresql://postgres:password@127.0.0.1:5432/postgres"
```

## Backup Usage

### `backup_db.sh`

Creates a timestamped database snapshot in the `daily/` and `weekly/` directories. 
It retains the **7 most recent daily backups** and **4 most recent weekly backups** (promoted on Sundays).
All files are automatically compressed with `gzip`. A `latest-*.sql.gz` copy is maintained in the root directory for easy integration with future offsite backup tools.

**Example (Manual run):**
```bash
./backup_db.sh
```

### Automation via Host Cron
To enable automated daily backups, add the script to the host's crontab:
1. run `crontab -e`.
2. Add the following line to execute at 2:00 AM daily:
```bash
0 2 * * * /absolute/path/to/Magazyn/infra/backups/backup_db.sh >> /var/log/magazyn-backup.log 2>&1
```

## Restore Usage

### `restore_db.sh <PATH_TO_SNAPSHOT_FILE.gz>`

Restores the database from a specified snapshot file.

> **WARNING:** This is a destructive operation and will **overwrite** the current database. Confirmation is required.

It clears existing schemas, uncompresses and applies the snapshot on-the-fly, and restarts services.

**Example:**
```bash
./restore_db.sh daily/public-rollback-20231025-020000.sql.gz
```

### `clear_schemas.sql`

Internal SQL script used by `restore_db.sh` to safely drop all objects in `public` and `supabase_migrations` schemas, ensuring a clean state for restoration.
