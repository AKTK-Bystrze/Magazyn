import sqlite3
import csv
from pathlib import Path

# Script for migrating CSV data to database
# Connect to the SQLite database (or create it if it doesn't exist)
conn = sqlite3.connect('magazyn.db')
cursor = conn.cursor()
#CSV file with newest data
csv_file_path = Path("C:/Users/uzytkownik/Downloads/Inwentaryzacja sprzętu 08.2024.csv")

with csv_file_path.open('r', encoding='utf-8') as file:
    reader = csv.DictReader(file)

    # Iterate over the rows in the CSV
    for row in reader:
        i_name = row['Numer']
        i_description = row['Uwagi']
        i_status = "ok"
        i_type = row['Sprzęt']
        try:
            cursor.execute('''
            INSERT INTO items (i_name, i_description, i_status, i_type)
            VALUES (?, ?, ?, ?)
            ''', (i_name, i_description, i_status, i_type))
        except Exception:
            print(f"Exception skip itme: {i_name} , {i_description}, {i_status}, {i_type}")
            

conn.commit()
conn.close()