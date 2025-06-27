import os
import csv
import psycopg2

# Konfiguracja połączenia z PostgreSQL
DB_CONFIG = {
    'dbname': 'magazyn',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost',
    'port': '54320',
}

# Ścieżki do plików CSV
USERS_CSV = r'PATH'
ITEMS_CSV = r'PATH'

def import_users(cursor, csv_path):
    with open(csv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            username = row.get('u_username') or row.get('Imię i nazwisko')  # fallback na Twoje pole z CSV
            email = row.get('u_email') or row.get('Adres email')
            if not username or not email:
                print(f"⚠️ Pominięto użytkownika z brakującymi danymi: {row}")
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
                print(f"❌ Błąd importowania użytkownika {username}: {e}")

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
                print(f"⚠️ Pominięto przedmiot z brakującą nazwą: {row}")
                continue

            raw_type = row.get('i_type', '').strip()
            mapped_type = TYPE_MAP.get(raw_type)
            if not mapped_type:
                print(f"⚠️ Pominięto przedmiot '{name}' o nieznanym typie: '{raw_type}'")
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
                print(f"❌ Błąd importowania przedmiotu {name}: {e}")

def main():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()

        print("➡ Importowanie użytkowników...")
        import_users(cursor, USERS_CSV)

        print("➡ Importowanie ekwipunku...")
        import_items(cursor, ITEMS_CSV)

        print("✅ Import zakończony sukcesem.")
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Nie udało się połączyć z bazą danych: {e}")

if __name__ == '__main__':
    main()
