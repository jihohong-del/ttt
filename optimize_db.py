import json
import os
import random

def optimize_food_database(input_file="combined_food_data.json", output_file="food_data_final.json", target_size_items=25000):
    """
    거대한 JSON 파일을 읽어 중요 키워드 위주로 필터링하고 무작위 샘플링을 결합하여 
    브라우저에서 사용 가능한 경량화된 JSON 파일을 생성합니다.
    """
    print(f"[{input_file}] 읽기 시작... (시간이 다소 소요될 수 있습니다)")
    
    try:
        if not os.path.exists(input_file):
            print(f"Error: {input_file} 파일이 존재하지 않습니다.")
            return

        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        print(f"원본 데이터 개수: {len(data)}개")

        # 1. 중요 키워드 기반 우선 순위 필터링 (한국인이 자주 찾는 음식군)
        priority_keywords = [
            "밥", "국", "찌개", "볶음", "조림", "구이", "찜", "튀김", "면", 
            "김치", "김밥", "라면", "치킨", "피자", "햄버거", "샐러드", "샌드위치",
            "빵", "떡", "과일", "커피", "우유", "음료", "소스", "고기", "생선"
        ]
        
        priority_items = []
        other_items = []
        
        for item in data:
            name = item.get("식품명") or item.get("음식명") or item.get("name") or ""
            if any(keyword in name for keyword in priority_keywords):
                priority_items.append(item)
            else:
                other_items.append(item)
        
        print(f"우선순위(키워드) 매칭 데이터: {len(priority_items)}개")
        
        # 2. 결과 조합
        # 키워드 매칭된 데이터가 타겟보다 많으면 거기서만 샘플링, 적으면 나머지와 합쳐서 충당
        if len(priority_items) >= target_size_items:
            final_data = random.sample(priority_items, target_size_items)
        else:
            remaining_needed = target_size_items - len(priority_items)
            # 나머지 데이터가 충분하면 샘플링해서 추가
            if len(other_items) >= remaining_needed:
                final_data = priority_items + random.sample(other_items, remaining_needed)
            else:
                final_data = priority_items + other_items

        print(f"최종 최적화 데이터 개수: {len(final_data)}개")

        # 3. 저장 (공백 제거하여 용량 최소화)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_data, f, ensure_ascii=False, separators=(',', ':'))
            
        orig_size = os.path.getsize(input_file) / (1024 * 1024)
        new_size = os.path.getsize(output_file) / (1024 * 1024)
        
        print(f"\n최적화 완료!")
        print(f"원본 용량: {orig_size:.2f} MB")
        print(f"최종 용량: {new_size:.2f} MB")
        print(f"저장된 파일: {output_file}")

    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    optimize_food_database()
