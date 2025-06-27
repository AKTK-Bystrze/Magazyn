import os
import csv

# Ścieżka do katalogu z plikami CSV
katalog = r'PATH'
output_dir = os.path.join(katalog, "output")
merged_file = os.path.join(output_dir, "items.csv")

# Lista do trzymania wszystkich wierszy z osobnych plików
all_rows = []

# Przetwarzanie plików źródłowych
for filename in os.listdir(katalog):
    if filename.endswith('.csv') and '-' in filename:
        full_path = os.path.join(katalog, filename)

        # Wyciągnij nazwę ekwipunku z nazwy pliku
        ekwipunek = filename.split('-')[-1].replace('.csv', '').strip()
        output_file = os.path.join(output_dir, f"{ekwipunek}.csv")

        print(f"Przetwarzanie pliku: {os.path.basename(full_path)} -> {os.path.basename(output_file)}")

        with open(full_path, encoding='utf-8') as f_in:
            reader = csv.reader(f_in)
            rows = list(reader)

            if not rows:
                continue  # pomiń pusty plik

            naglowki = rows[0]
            prawdziwe_naglowki = [(i, h.strip()) for i, h in enumerate(naglowki) if h.strip()]

            dane = []
            for row in rows[1:]:
                wiersz = {}
                for i, naglowek in prawdziwe_naglowki:
                    wiersz[naglowek] = row[i].strip() if i < len(row) else ''
                dane.append(wiersz)

        # Utwórz katalog output, jeśli nie istnieje
        os.makedirs(output_dir, exist_ok=True)

        with open(output_file, 'w', newline='', encoding='utf-8') as f_out:
            writer = csv.writer(f_out)
            writer.writerow(['i_type', 'i_name', 'i_description'])

            for row in dane:
                numer = row.get('Nr klubowy', '')
                uwagi = [
                    f"{k}-{v}" for k, v in row.items()
                    if k not in ['Nr klubowy', 'lp.'] and v
                ]
                opis = ' '.join(uwagi)
                writer.writerow([ekwipunek, numer, opis])
                all_rows.append([ekwipunek, numer, opis])  # Zbieraj do scalonego

# Zapisz scalony plik CSV
with open(merged_file, 'w', newline='', encoding='utf-8') as f_merged:
    writer = csv.writer(f_merged)
    writer.writerow(['i_type', 'i_name', 'i_description'])
    writer.writerows(all_rows)

print(f"\n✅ Scalony plik zapisany jako: {os.path.basename(merged_file)}")
