# Set your connection details
PG_USER="postgres"
PG_PASSWORD="postgres"
PG_HOST="localhost"
PG_PORT="54320"
PG_DB="magazyn"

# Take an optional string parameter
SUFFIX="${1:-}"

# 3. Backup PostgreSQL database
echo "💾 Backing up PostgreSQL database..."
export PATH=/usr/pgsql-17/bin:$PATH
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

if [ -n "$SUFFIX" ]; then
    BACKUP_FILE="/var/backups/magazyn/_${TIMESTAMP}_${SUFFIX}.sql"
else
    BACKUP_FILE="/var/backups/magazyn/_${TIMESTAMP}.sql"
fi

export PGPASSWORD=$PG_PASSWORD
pg_dump -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -F c -b -v -f "$BACKUP_FILE" "$PG_DB"

echo "✅ Backup saved as $BACKUP_FILE"