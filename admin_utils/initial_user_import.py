import csv
import re
import sys

def is_valid_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

# Import data from Google Drive sheets: credits_sheet ("Wykaz godzinek") and rentals_sheet ("Arkusz wypożyczeń Bystrze v1.1/Rozliczenie 2024/2025")
# Remove the cost table from the rentals sheet before import, as it is not needed
if len(sys.argv) != 3:
    print("Usage: python initial_user_import.py <credits_sheet_path> <rentals_sheet_path>")
    sys.exit(1)

credits_sheet = sys.argv[1]
rentals_sheet = sys.argv[2]
result_file = "users_list_with_emails_and_credits.csv"

members = {}
with open(credits_sheet, encoding='utf-8') as f1:
    reader = csv.reader(f1)
    for _ in range(4):  # Skip headers and empty rows
        next(reader)
    for row in reader:
        if len(row) < 5:
            continue
        name = row[0].strip()
        credits_balance = row[1].strip()
        status = row[4].strip()
        if status == 'AKTYWNY':
            status = True
        else:
            status = False
        members[name] = {
            'Credits balance (sum)': credits_balance,
            'Membership status': status
        }
print(f"Found {len(members)} members in the credits sheet.")

# Read data from the second sheet and add email
with open(rentals_sheet, encoding='utf-8') as f2:
    reader = csv.DictReader(f2)
    for row in reader:
        name = row['Wypożyczający'].strip()
        email = row['Adres email'].strip()
        if not is_valid_email(email):
            email = ''
        if name in members:
            members[name]['Email address'] = email
        else:
            members[name] = {
                'Credits balance (sum)': '',
                'Membership status': '',
                'Email address': email
            }
print(f"Updated email data for {len(members)} members.")

# Save the result to a CSV file
with open(result_file, 'w', newline='', encoding='utf-8') as f_out:
    fieldnames = ['u_username', 'u_email', 'u_credits', 'u_enabled']
    
    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    writer.writeheader()
    for name, data in members.items():
        writer.writerow({
            'u_username': name,
            'u_email': data.get('Email address', ''),
            'u_credits': data.get('Credits balance (sum)', ''),
            'u_enabled': data.get('Membership status', '')
        })
print(f"Data has been saved to file: {result_file}")
