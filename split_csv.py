import csv
import os
import sys

csv.field_size_limit(sys.maxsize)

input_file = '/Users/erdem/.gemini/antigravity/scratch/Ormanlar/public/MukerrerOrmanlar_Tumiller.csv'
output_dir = '/Users/erdem/.gemini/antigravity/scratch/Ormanlar/public/iller'

os.makedirs(output_dir, exist_ok=True)

# Delete existing CSV files in the directory
for filename in os.listdir(output_dir):
    if filename.endswith(".csv"):
        file_path = os.path.join(output_dir, filename)
        os.remove(file_path)
        print(f"Silindi: {filename}")

file_handles = {}
writers = {}

try:
    with open(input_file, mode='r', encoding='utf-8') as infile:
        reader = csv.reader(infile, delimiter=';')
        try:
            header = next(reader)
        except StopIteration:
            header = []
            
        il_index = 0
        for i, col in enumerate(header):
            if "orman_a_ilad" in col:
                il_index = i
                break
                
        count = 0
        for row in reader:
            if not row:
                continue
            il = row[il_index].strip(' \t\n\r"')
            if not il:
                continue
                
            if il not in writers:
                out_path = os.path.join(output_dir, f"{il}.csv")
                f = open(out_path, mode='w', encoding='utf-8', newline='')
                file_handles[il] = f
                writer = csv.writer(f, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                writer.writerow(header)
                writers[il] = writer
                print(f"Dosya olusturuldu: {il}.csv")
                
            writers[il].writerow(row)
            count += 1
            
            if count % 1000 == 0:
                pass # Just processing
                
    print(f"Toplam {count} satir islendi ve illere gore bolundu.")
finally:
    for f in file_handles.values():
        f.close()
