import os
import csv

# Ścieżka do katalogu z plikami CSV
katalog = r'C:\Users\uzytkownik\Desktop\Bystrze_magazyn\Magazyn\scratch\init_data'

for filename in os.listdir(katalog):
    if filename.endswith('.csv') and '-' in filename:
        full_path = os.path.join(katalog, filename)

        # Wyciągnij nazwę ekwipunku z nazwy pliku
        ekwipunek = filename.split('-')[-1].replace('.csv', '').strip()
        output_file = os.path.join(katalog,"output", f"{ekwipunek}.csv")

        print(f"Przetwarzanie pliku: {os.path.basename(full_path)} -> {os.path.basename(output_file)}")

        with open(full_path, encoding='utf-8') as f_in:
            reader = csv.reader(f_in)
            rows = list(reader)

            # Pierwszy wiersz = nagłówki
            naglowki = rows[0]
            prawdziwe_naglowki = [(i, h.strip()) for i, h in enumerate(naglowki) if h.strip()]

            # Zbuduj DictReader ręcznie, tylko z kolumn z nagłówkami
            dane = []
            for row in rows[1:]:
                wiersz = {}
                for i, naglowek in prawdziwe_naglowki:
                    wiersz[naglowek] = row[i].strip() if i < len(row) else ''
                dane.append(wiersz)
        #create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w', newline='', encoding='utf-8') as f_out:
            writer = csv.writer(f_out)
            writer.writerow(['nazwa ekwipunku', 'Numer', 'Uwagi'])

            for row in dane:
                numer = row.get('Nr klubowy', '')
                uwagi = [
                    f"{k}-{v}" for k, v in row.items()
                    if k not in ['Nr klubowy', 'lp.'] and v
                ]
                writer.writerow([ekwipunek, numer, ' '.join(uwagi)])
