import csv
import psycopg2
import argparse
import os
import subprocess
import datetime

# PostgreSQL connection configuration
DB_CONFIG = {
    'dbname': 'magazyn',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost',
    'port': '54320',
}

def backup_database(import_file):
    import_base = os.path.splitext(os.path.basename(import_file))[0]
    suffix = f"before_csv_import_{import_base}"
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backup_script = os.path.join(script_dir, "dbBackup.sh")
    print(f"💾 Backing up database before import (suffix: {suffix})...")
    try:
        subprocess.run([backup_script, suffix], check=True)
    except Exception as e:
        print(f"❌ Failed to backup database: {e}")
        exit(2)

def import_users(cursor, csv_path):
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            username = row.get('u_username') or row.get('Imię i nazwisko')
            email = row.get('u_email') or row.get('Adres email')
            if not username or not email:
                print(f"⚠️ Skipped user with missing data: {row}")
                continue
            try:
                cursor.execute("""
                    INSERT INTO users (u_username, u_password_hash, u_email, u_role, u_credits, u_enabled)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (u_email) DO NOTHING
                """, (
                    username.strip(),
                    row.get('u_password_hash'),
                    email.strip(),
                    row.get('u_role', 'user'),
                    int(row.get('u_credits') or 0),
                    str(row.get('u_enabled', 'false')).lower() in ['true', '1', 't']
                ))
            except Exception as e:
                print(f"❌ Error importing user {username}: {e}")

TYPE_MAP = {
    'Kajak': 'kayak',
    'Kajaki': 'kayak',
    'Wiosła': 'paddle',
    'Kamizelki': 'life_jacket',
    'Kaski': 'helmet',
    'Liny': 'rope',
    'Pianki': 'wetsuit',
    'Kurtki': 'jacket',
    'Fartuchy': 'spray_skirt',
    'Rzutki': 'rope',
}

def import_items(cursor, csv_path):
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('i_name')
            if not name:
                print(f"⚠️ Skipped item with missing name: {row}")
                continue

            raw_type = row.get('i_type', '').strip()
            mapped_type = TYPE_MAP.get(raw_type)
            if not mapped_type:
                print(f"⚠️ Skipped item '{name}' with unknown type: '{raw_type}'")
                continue

            try:
                cursor.execute("""
                    INSERT INTO items (i_name, i_description, i_status, i_type)
                    VALUES (%s, %s, %s, %s)
                """, (
                    name.strip(),
                    row.get('i_description', '').strip(),
                    row.get('i_status', 'ok').strip(),
                    mapped_type
                ))
            except Exception as e:
                print(f"❌ Error importing item {name}: {e}")

def main():
    parser = argparse.ArgumentParser(description="Import CSV data to PostgreSQL.")
    parser.add_argument('--users-csv', required=False, help='Path to users CSV file')
    parser.add_argument('--items-csv', required=False, help='Path to items CSV file')
    args = parser.parse_args()

    if not args.users_csv and not args.items_csv:
        print("Nothing to import. Please provide at least --users-csv or --items-csv.")
        exit(1)

    # Backup before import (use the first provided file for the suffix)
    import_file = args.users_csv or args.items_csv
    backup_database(import_file)

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()

        if args.users_csv:
            print("➡ Importing users...")
            import_users(cursor, args.users_csv)

        if args.items_csv:
            print("➡ Importing equipment...")
            import_items(cursor, args.items_csv)

        print("✅ Import completed successfully.")
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Failed to connect to the database: {e}")

if __name__ == '__main__':
    main()
