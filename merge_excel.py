import pandas as pd
import json

# 합칠 파일 리스트
files = ['DB1.xlsx', 'DB2.xlsx']
all_data = []

for file in files:
    try:
        print(f"Reading {file}...")
        # 엑셀 파일 읽기
        df = pd.read_excel(file)
        
        # 데이터를 딕셔너리 형태로 변환하여 리스트에 추가
        data = df.to_dict(orient='records')
        all_data.extend(data)
        print(f"Successfully read {len(data)} rows from {file}")
        
    except Exception as e:
        print(f"Error reading {file}: {e}")

# 하나의 JSON 파일로 저장
output_file = 'combined_food_data.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=4)

print("---")
print(f"Done! Combined data saved to {output_file}")
print(f"Total combined entries: {len(all_data)}")