import os
import csv

# Path to the directory with CSV files
directory = r'PATH'
output_dir = os.path.join(directory, "output")
merged_file = os.path.join(output_dir, "items.csv")

# List to hold all rows from separate files
all_rows = []

# Processing source files
for filename in os.listdir(directory):
    if filename.endswith('.csv') and '-' in filename:
        full_path = os.path.join(directory, filename)

        # Extract equipment name from the file name
        equipment = filename.split('-')[-1].replace('.csv', '').strip()
        output_file = os.path.join(output_dir, f"{equipment}.csv")

        print(f"Processing file: {os.path.basename(full_path)} -> {os.path.basename(output_file)}")

        with open(full_path, encoding='utf-8') as f_in:
            reader = csv.reader(f_in)
            rows = list(reader)

            if not rows:
                continue  # skip empty file

            headers = rows[0]
            real_headers = [(i, h.strip()) for i, h in enumerate(headers) if h.strip()]

            data = []
            for row in rows[1:]:
                row_dict = {}
                for i, header in real_headers:
                    row_dict[header] = row[i].strip() if i < len(row) else ''
                data.append(row_dict)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        with open(output_file, 'w', newline='', encoding='utf-8') as f_out:
            writer = csv.writer(f_out)
            writer.writerow(['i_type', 'i_name', 'i_description'])

            for row in data:
                number = row.get('Nr klubowy', '')
                remarks = [
                    f"{k}-{v}" for k, v in row.items()
                    if k not in ['Nr klubowy', 'lp.'] and v
                ]
                description = ' '.join(remarks)
                writer.writerow([equipment, number, description])
                all_rows.append([equipment, number, description])  # Collect for merged file

# Save merged CSV file
with open(merged_file, 'w', newline='', encoding='utf-8') as f_merged:
    writer = csv.writer(f_merged)
    writer.writerow(['i_type', 'i_name', 'i_description'])
    writer.writerows(all_rows)

print(f"\n✅ Merged file saved as: {os.path.basename(merged_file)}")
