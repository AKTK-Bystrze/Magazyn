import csv
import os
import re

def is_valid_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

# Importuj dane z arkuszy z dysku google. arkusz_godzinek (Wykaz godzinek) i arkusz_wypozyczen (Arkusz wypożyczeń Bystrze v1.1/Rozliczenie 2024/2025)
# z arkusza wypozyczen usun tabelke kosztu przed importem, bo nie jest potrzebna
arkusz_godzinek = r"PATH"
arkusz_wypozyczen = r"PATH"
resultFile = "users_list_with_emails_and_credits.csv"

czlonkowie = {}
with open(arkusz_godzinek, encoding='utf-8') as f1:
    reader = csv.reader(f1)
    for _ in range(4):  # Pomijamy nagłówki i puste wiersze
        next(reader)
    for row in reader:
        if len(row) < 5:
            continue
        imie_nazwisko = row[0].strip()
        stan_godzinek = row[1].strip()
        status = row[4].strip()
        if status == 'AKTYWNY':
            status = True
        else:
            status = False
        czlonkowie[imie_nazwisko] = {
            'Stan godzinek (suma)': stan_godzinek,
            'Status członkostwa': status
        }
print(f"Znaleziono {len(czlonkowie)} członków w arkuszu godzinek.")

# Wczytaj dane z arkusza 2 i dołącz email
with open(arkusz_wypozyczen, encoding='utf-8') as f2:
    reader = csv.DictReader(f2)
    for row in reader:
        imie_nazwisko = row['Wypożyczający'].strip()
        email = row['Adres email'].strip()
        if not is_valid_email(email):
            email = ''
        if imie_nazwisko in czlonkowie:
            czlonkowie[imie_nazwisko]['Adres email'] = email
        else:
            czlonkowie[imie_nazwisko] = {
                'Stan godzinek (suma)': '',
                'Status członkostwa': '',
                'Adres email': email
            }
print(f"Zaktualizowano dane o emailach dla {len(czlonkowie)} członków.")

# Zapisz wynik do pliku CSV
with open(resultFile, 'w', newline='', encoding='utf-8') as f_out:
    fieldnames = ['u_username', 'u_email', 'u_credits', 'u_enabled']
    
    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    writer.writeheader()
    for imie_nazwisko, dane in czlonkowie.items():
        writer.writerow({
            'u_username': imie_nazwisko,
            'u_email': dane.get('Adres email', ''),
            'u_credits': dane.get('Stan godzinek (suma)', ''),
            'u_enabled': dane.get('Status członkostwa', '')
        })
print(f"Dane zostały zapisane do pliku: {resultFile}")
