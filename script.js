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
 * 🔴 MOCK AI SERVICE (가상 AI 응답 서비스)
 * ---------------------------------------------------------
 * 실제 운영 환경에서는 이 함수 내부를 변경하여 
 * OpenAI API (GPT-4) 혹은 Google Gemini API를 호출하도록 
 * 코드를 교체하시면 됩니다.
 * 
 * prompt 예시:
 * `사용자 프로필: 키 ${height}cm, 체중 ${weight}kg, 성별 ${gender}, 나이 ${age}, 활동량 ${activity_multiplier}
 *  사용자 식사 기록: ${mealText}
 *  다음 JSON 형식으로 응답해: {"meal_analysis":...}`
 */
async function mockAIAnalysis(mealText, targetCals) {
    // 실제 API 호출을 흉내내기 위해 1.5초 대기
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 단순 키워드 매칭으로 가상의 결과 생성
    const keywords = ['피자', '콜라', '햄버거', '치즈버거', '초코파이', '샐러드', '닭가슴살', '커피', '밥', '김치찌개'];
    let ingestedCals = 0;
    let items = [];

    // 입력 텍스트에 따라 가상의 분석 정보 생성
    if (mealText.includes('버거') && mealText.includes('콜라') && mealText.includes('초코파이')) {
        items = [
            { item: "치즈버거 세트", amount: "1인분", calories: 850 },
            { item: "제로콜라", amount: "1컵", calories: 0 },
            { item: "초코파이", amount: "1개", calories: 170 }
        ];
        ingestedCals = 1020;
    } else if (mealText.includes('샐러드') || mealText.includes('닭가슴살')) {
        items = [
            { item: "닭가슴살 샐러드", amount: "1접시", calories: 350 },
            { item: "발사믹 드레싱", amount: "2스푼", calories: 50 }
        ];
        ingestedCals = 400;
    } else {
        // 기본 랜덤 생성 (데모용)
        items = [
            { item: "일반 식사 (추정)", amount: "1식", calories: 700 }
        ];
        ingestedCals = 700;
    }

    // 상태 및 피드백 로직
    const remainingCals = targetCals - ingestedCals;
    let status = "적정";
    let feedback = "";

    if (ingestedCals > targetCals * 0.5) {
        status = "과다";
        feedback = `한 끼 식사로 너무 많은 칼로리를 섭취하셨습니다 (일일 권장량의 ${Math.round((ingestedCals/targetCals)*100)}%). 가벼운 산책을 통해 소화를 돕고, 다음 식사는 샐러드나 탄수화물을 줄인 식단으로 조절하시는 것을 권장합니다.`;
    } else if (ingestedCals < targetCals * 0.1) {
        status = "부족";
        feedback = "권장 칼로리에 비해 식사량이 너무 적습니다. 균형 잡힌 영양소 섭취를 위해 단백질과 식이섬유가 풍부한 간식을 보충해주세요.";
    } else {
        status = "적정";
        feedback = "좋습니다! 한 끼 식사로 매우 적절한 양과 칼로리를 섭취하셨습니다. 현재의 식습관을 잘 유지해주세요. 식후 가벼운 스트레칭이나 걷기는 소화에 큰 도움이 됩니다.";
    }

    // 목표 JSON 포맷 형태로 반환
    return {
        "meal_analysis": items,
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

            // 2. AI 분석 호출 (현재는 로컬 Mock)
            // 나중에 이곳에서 실제 서버 API (예: fetch('/api/analyze', { method: 'POST', body: JSON.stringify(...) })) 를 호출하도록 수정
            const response = await mockAIAnalysis(mealInput, tdee);

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
