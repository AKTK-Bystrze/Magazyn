#!/bin/bash

set -e

usage() {
    echo "Usage:"
    echo "  $0 <temp_db_name> <backup_file_path>         # Load backup into temp db"
    echo "  $0 <backup_file_path> --restore              # Restore 'magazyn' db from backup (DANGEROUS!)"
    exit 1
}

if [ "$#" -eq 2 ] && [ "$2" == "--restore" ]; then
    # Restore mode: $1 = backup file, $2 = --restore
    TEMP_DB=""
    BACKUP_FILE="$1"
    RESTORE_FLAG="--restore"
elif [ "$#" -eq 2 ]; then
    # Temp db mode: $1 = temp db, $2 = backup file
    TEMP_DB="$1"
    BACKUP_FILE="$2"
    RESTORE_FLAG=""
elif [ "$#" -eq 3 ] && [ "$3" == "--restore" ]; then
    # Both temp db and restore (not recommended, but supported)
    TEMP_DB="$1"
    BACKUP_FILE="$2"
    RESTORE_FLAG="--restore"
else
    usage
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file '$BACKUP_FILE' does not exist."
    exit 2
fi

if [ "$RESTORE_FLAG" == "--restore" ]; then
    echo "WARNING: This will DROP the existing 'magazyn' database and replace it with the backup!"
    read -p "Are you sure you want to continue? Type YES to proceed: " CONFIRM
    if [ "$CONFIRM" != "YES" ]; then
        echo "Aborted."
        exit 3
    fi

    # Backup current 'magazyn' database before dropping
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "Backing up current 'magazyn' database before restore..."
    bash "$SCRIPT_DIR/dbBackup.sh" replaced

    echo "Dropping existing 'magazyn' database..."
    dropdb --if-exists magazyn

    echo "Creating new 'magazyn' database..."
    createdb magazyn

    echo "Restoring backup into 'magazyn'..."
    pg_restore -U postgres -d magazyn "$BACKUP_FILE"

    echo "✅ 'magazyn' database has been restored from backup."
elif [ -n "$TEMP_DB" ]; then
    echo "Creating temporary database '$TEMP_DB'..."
    dropdb --if-exists "$TEMP_DB"
    createdb "$TEMP_DB"

    echo "Restoring backup into '$TEMP_DB'..."
    pg_restore -U postgres -d "$TEMP_DB" "$BACKUP_FILE"

    echo "✅ Temporary database '$TEMP_DB' loaded from backup. No changes made to 'magazyn'."
else
    echo "No valid operation specified. Use --restore to restore 'magazyn' or provide a temp db name."
    usage
fi