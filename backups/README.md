# Database Backup System

PostgreSQL backup/restore scripts using a dedicated `magazyn` user.

## Setup

```bash
# Run setup script
sudo ./backups/setup-backup-user.sh

# Add connection info to .pgpass
sudo nano /var/lib/magazyn/.pgpass

# Format: hostname:port:database:username:password
#
# Remote Supabase:
# db.<project-ref>.supabase.co:5432:postgres:postgres:your_password
#
# Local Supabase:
# localhost:54322:postgres:postgres:postgres
```

## Usage

**Create snapshot:**
```bash
./backups/create-snapshot.sh
# Creates: /var/lib/magazyn/snapshots/<GIT_TAG>/db-state-YYYYMMDD-HHMMSS.sql
```

**Restore:**
```bash
./backups/rollback-to.sh /var/lib/magazyn/snapshots/v1.0.0/db-state-20240207-143052.sql
```

## Access Control

Only users in the `magazyn` group can run backups:

```bash
sudo usermod -aG magazyn username
```

## Configuration

All connection details are stored in `/var/lib/magazyn/.pgpass`:
- **hostname**: `db.<ref>.supabase.co` (remote) or `localhost` (local)
- **port**: `5432` (remote) or `54322` (local)  
- **database**: `postgres`
- **username**: `postgres`
- **password**: your database password

PostgreSQL tools automatically read these from `~/.pgpass`.

## File Structure

```
/var/lib/magazyn/
├── .pgpass        # PostgreSQL password file (600)
└── snapshots/     # Backups (750)
```
