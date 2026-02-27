/**
 * TDEE calculation based on Mifflin-St Jeor equation
 */
function calculate_tdee(height, weight, age, gender, activity_multiplier) {
    let bmr;
    if (gender === "male") {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    return Math.round((bmr * activity_multiplier) * 100) / 100;
}

/**
 * ---------------------------------------------------------
 * 🟢 LOCAL JSON DATA SERVICE (경량화된 식품 데이터 사용)
 * ---------------------------------------------------------
 * food_data_final.json 파일을 불러와서 사용자 입력 텍스트와 매칭합니다.
 */
async function localDataAnalysis(mealText, targetCals) {
    // 1. 이미 로드된 글로벌 변수(FOOD_DATABASE) 사용
    let foodDatabase = [];

    if (typeof FOOD_DATABASE !== 'undefined') {
        foodDatabase = FOOD_DATABASE;
    } else {
        console.error("FOOD_DATABASE가 로드되지 않았습니다.");
        return {
            "meal_analysis": [{ item: "데이터 연결 오류", amount: "1", calories: 0 }],
            "total_ingested_calories": 0,
            "daily_target_calories": targetCals,
            "status": "오류",
            "coach_feedback": "음식 데이터베이스를 찾을 수 없습니다. food_data.js 파일이 존재하지 않거나 로드되지 않았습니다."
        };
    }

    // 2. 사용자가 입력한 텍스트에서 음식 찾기
    const matchedItems = [];
    let ingestedCals = 0;

    // 간단한 키워드 매칭 로직 (띄어쓰기 무시, 소문자 변환 후 검색)
    const normalizedInput = mealText.replace(/\s+/g, '').toLowerCase();

    foodDatabase.forEach(food => {
        // 데이터셋의 다양한 필드명을 지원합니다.
        const foodName = food["식품명"] || food["음식명"] || food["name"] || "";
        const foodAmount = food["영양성분함량기준량"] || food["추정 섭취량"] || food["amount"] || "1인분";
        const calories = parseFloat(food["칼로리(kcal)"] || food["calories"] || 0);

        // 사용자의 식사 기록에 이 음식 이름이 포함되어 있는지 확인
        if (foodName && normalizedInput.includes(foodName.replace(/\s+/g, '').toLowerCase())) {
            matchedItems.push({
                item: foodName,
                amount: foodAmount,
                calories: calories
            });
            ingestedCals += calories;
        }
    });

    // 만약 매칭된 음식이 하나도 없다면
    if (matchedItems.length === 0) {
        return {
            "meal_analysis": [{ item: "인식된 음식 없음", amount: "-", calories: 0 }],
            "total_ingested_calories": 0,
            "daily_target_calories": targetCals,
            "status": "알 수 없음",
            "coach_feedback": "입력하신 식사 내용에서 데이터베이스에 등록된 음식을 찾지 못했습니다. 보다 구체적인 음식명을 입력해보세요."
        };
    }

    // 3. 상태 및 피드백 생성
    let status = "적정";
    let feedback = "";

    if (ingestedCals > targetCals * 0.5) {
        status = "과다";
        feedback = `한 끼 식사로 너무 많은 칼로리를 섭취하셨습니다 (일일 권장량의 ${Math.round((ingestedCals / targetCals) * 100)}%). 가벼운 산책을 통해 소화를 돕고, 다음 식사는 가볍게 드시는 것을 권장합니다.`;
    } else if (ingestedCals < targetCals * 0.1) {
        status = "부족";
        feedback = "권장 칼로리에 비해 식사량이 적습니다. 영양소 보충을 위해 단백질이 포함된 간식을 보완해 보세요.";
    } else {
        status = "적정";
        feedback = "좋습니다! 한 끼 식사로 매우 적절한 양과 칼로리를 섭취하셨습니다. 현재의 식습관을 잘 유지해주세요.";
    }

    return {
        "meal_analysis": matchedItems,
        "total_ingested_calories": ingestedCals,
        "daily_target_calories": targetCals,
        "status": status,
        "coach_feedback": feedback
    };
}


/**
 * UI Interaction & Event Listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultSection = document.getElementById('result-section');
    const btnLoader = document.getElementById('btn-loader');
    const btnText = analyzeBtn.querySelector('span');

    analyzeBtn.addEventListener('click', async () => {
        // 입력값 가져오기
        const height = parseFloat(document.getElementById('height').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const age = parseInt(document.getElementById('age').value);
        const gender = document.getElementById('gender').value;
        const activity = parseFloat(document.getElementById('activity').value);
        const mealInput = document.getElementById('meal-input').value.trim();

        if (!mealInput) {
            alert('식사 기록을 입력해주세요!');
            return;
        }
        if (!height || !weight || !age) {
            alert('신체 정보를 정확히 입력해주세요!');
            return;
        }

        // 로딩 UI 시작
        analyzeBtn.disabled = true;
        btnText.style.opacity = '0.3';
        btnLoader.classList.remove('hidden');

        try {
            // 1. TDEE 계산
            const tdee = calculate_tdee(height, weight, age, gender, activity);

            // 2. 로컬 JSON 분석 호출
            const response = await localDataAnalysis(mealInput, tdee);

            // 3. UI 렌더링
            renderResults(response, tdee);

            // 결과 섹션 표시 및 스크롤 유도
            resultSection.classList.remove('hidden');
            setTimeout(() => {
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

        } catch (error) {
            console.error('분석 중 오류 발생:', error);
            alert('분석에 실패했습니다. 다시 시도해주세요.');
        } finally {
            // 로딩 UI 종료
            analyzeBtn.disabled = false;
            btnText.style.opacity = '1';
            btnLoader.classList.add('hidden');
        }
    });

    function renderResults(data, tdee) {
        // 숫자 업데이트
        document.getElementById('target-cal').innerText = Math.round(tdee).toLocaleString();
        document.getElementById('ingested-cal').innerText = data.total_ingested_calories.toLocaleString();

        const remaining = Math.round(tdee - data.total_ingested_calories);
        document.getElementById('remaining-cal').innerText = remaining.toLocaleString();

        // 뱃지 상태 업데이트
        const badge = document.getElementById('status-badge');
        badge.innerText = data.status;
        badge.className = 'badge'; // reset
        if (data.status === '적정') badge.classList.add('success');
        else if (data.status === '과다') badge.classList.add('danger');
        else badge.classList.add('warning');

        // 프로그래스바 업데이트
        const percentage = Math.min((data.total_ingested_calories / tdee) * 100, 100).toFixed(1);
        document.getElementById('progress-percent').innerText = `${percentage}%`;

        const progressFill = document.getElementById('progress-fill');
        progressFill.style.width = `${percentage}%`;
        progressFill.className = 'progress-fill'; // reset

        // 하루 권장량의 1/3을 한 끼로 가정
        const mealRatio = data.total_ingested_calories / (tdee / 3);
        if (mealRatio > 1.2) {
            progressFill.classList.add('over');
        } else if (mealRatio > 0.8) {
            // 적정 (기본색 유지)
        } else {
            progressFill.classList.add('warning');
        }

        // 식사 리스트 렌더링
        const mealList = document.getElementById('meal-list');
        mealList.innerHTML = ''; // clear existing

        data.meal_analysis.forEach(item => {
            const li = document.createElement('li');
            li.className = 'meal-item';
            li.innerHTML = `
                <div class="meal-item-left">
                    <span class="meal-name">${escapeHTML(item.item)}</span>
                    <span class="meal-amount">${escapeHTML(item.amount)}</span>
                </div>
                <div class="meal-cals">${item.calories} kcal</div>
            `;
            mealList.appendChild(li);
        });

        // 코치 피드백 렌더링
        document.getElementById('coach-text').innerText = data.coach_feedback;
    }

    // XSS 방지 유틸
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
