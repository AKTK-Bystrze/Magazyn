# Basic DB Backups

PostgreSQL backup/restore scripts.

## Setup

Add DB connection string to `.env` in the project's root directory.

## Usage

**Create snapshot:**
```bash
./backups/create-snapshot.sh
# Creates: Magazyn/backups/snapshots/<GIT_TAG>/<TIMESTAMP>/ directory containing DB data 
```

**Restore:**
```bash
./backups/rollback-to.sh <PATH_TO_SNAPSHOT>
```
