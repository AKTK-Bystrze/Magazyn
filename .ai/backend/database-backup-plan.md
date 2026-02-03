# Implementation Plan - Database Backup System

## Goal Description
Implement a robust database backup and restore system for Supabase using `pg_dump` and Docker. Backups will be stored locally on the production server with a retention policy of 8 weekly backups.

## User Review Required
> [!IMPORTANT]
> **Database Credentials**: You must add `DATABASE_URL` to your `.env` file. This is required for `pg_dump` to connect to Supabase.
> Format: `DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

## Proposed Changes

### Infrastructure

#### [NEW] [backup_db.sh](../../infra/scripts/backup_db.sh)
- Script to create database backups.
- Features:
    - Loads configuration from `.env`.
    - Uses `docker` to run `pg_dump` (ensures tool compatibility).
    - Creates timestamped backups in `infra/backups/`.
    - Implements retention policy (keeps last 8 backups).
    - Supports manual execution and cron usage.

#### [NEW] [restore_db.sh](../../infra/scripts/restore_db.sh)
- Script to restore database from backup.
- Features:
    - Lists available backups.
    - Restores selected backup using `pg_restore`.
    - **Warning**: Overwrites current database data.

#### [MODIFY] [.env.example](../../.env.example)
- Add `DATABASE_URL` variable documentation.

## Architecture

### Backup Strategy
- **Frequency**: Weekly automated backups via cron
- **Retention**: Last 8 backups (approximately 2 months)
- **Format**: Custom format (`.dump`) for flexibility with `pg_restore`
- **Location**: `infra/backups/` on production server
- **Naming**: `backup_YYYY-MM-DD_HH-MM-SS.dump`

### Data Flow

```mermaid
flowchart TB
    subgraph "Production Server"
        subgraph "Docker Services"
            DB[("Supabase Cloud DB")]
        end
        
        subgraph "Backup Scripts"
            BS[backup_db.sh]
            RS[restore_db.sh]
        end
        
        subgraph "Backup Storage"
            BF[("/infra/backups/")]
            BF --> |"backup_*.dump"| D1[Backup Files]
        end
    end
    
    BS -->|"pg_dump via Docker"| DB
    DB -->|"dump file"| BF
    RS -->|"reads"| BF
    RS -->|"pg_restore via Docker"| DB
    
    CRON["Cron Job (Weekly)"] -->|"triggers"| BS
```

## Implementation Details

### Backup Script (`backup_db.sh`)

**Responsibilities**:
1. Load `DATABASE_URL` from `.env`
2. Create timestamped backup using `pg_dump` in Docker
3. Save to `infra/backups/backup_YYYY-MM-DD_HH-MM-SS.dump`
4. Apply retention policy (delete oldest if more than 8 exist)
5. Log operation results

**Key Features**:
- Uses Docker to ensure `pg_dump` version compatibility
- Custom format for faster, more flexible restores
- Automatic cleanup of old backups
- Exit codes for cron error detection

### Restore Script (`restore_db.sh`)

**Responsibilities**:
1. List available backups with timestamps
2. Allow user to select a backup
3. Confirm destructive operation
4. Restore database using `pg_restore` in Docker
5. Report success/failure

**Safety Features**:
- Interactive confirmation before restore
- Validation of backup file existence
- Clear warnings about data loss

### Cron Setup

**Recommended Schedule**:
```bash
# Run every Sunday at 2 AM
0 2 * * 0 /path/to/Magazyn/infra/scripts/backup_db.sh >> /var/log/magazyn-backup.log 2>&1
```

## Verification Plan

### Manual Verification
1. **Setup**: Add `DATABASE_URL` to `.env`.
2. **Backup**: Run `./infra/scripts/backup_db.sh` and verify a new file is created in `infra/backups/`.
3. **Rotation**: Create 9+ dummy backup files and verify the script removes the oldest ones (keeping only 8).
4. **Restore**:
    - Make a benign change in DB (e.g. create a test table).
    - Restore from previous backup.
    - Verify change is gone.

### Automated Tests
- None (Infrastructure scripts).

## Security Considerations

1. **Credentials**: `DATABASE_URL` contains database password
   - Must be in `.env` (already in `.gitignore`)
   - Should not be logged or printed
2. **Backup Files**: Contain full database dump
   - Should have restricted file permissions (600 or 640)
   - Directory should be secured (700 or 750)
3. **Production Server**: Access must be restricted
   - SSH key-based authentication only
   - Backup directory outside web root

## Future Enhancements

1. **Encryption**: Encrypt backup files at rest using GPG
2. **Offsite Storage**: Copy backups to S3/GCS/Azure after creation
3. **Monitoring**: Send notifications on backup success/failure
4. **Incremental Backups**: Use WAL archiving for point-in-time recovery
5. **Compression**: Add gzip compression to reduce storage size
6. **Testing**: Automated restore testing to verify backup integrity
