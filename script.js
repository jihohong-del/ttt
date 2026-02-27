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

// Supabase 설정
const SUPABASE_URL = "https://vxzeoyfztxssckictiqn.supabase.co";
const SUPABASE_KEY = "sb_publishable_QW-xdIZaknLse1MkmvbEOA_GrEOB8yR";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * ---------------------------------------------------------
 * 🔵 SUPABASE DATA SERVICE (실시간 DB 연동)
 * ---------------------------------------------------------
 */
async function localDataAnalysis(mealText, targetCals) {
    const matchedItems = [];
    let ingestedCals = 0;

    try {
        // 1. 전체 데이터베이스 또는 특정 키워드로 검색 (여기서는 전체를 가져와서 필터링하는 방식 유지)
        const { data: foodDatabase, error } = await _supabase
            .from('foods')
            .select('*');

        if (error) throw error;

        // 2. 사용자가 입력한 텍스트에서 음식 찾기
        const normalizedInput = mealText.replace(/\s+/g, '').toLowerCase();

        foodDatabase.forEach(food => {
            const foodName = food.name || "";
            const foodAmount = food.amount || "1인분";
            const calories = parseFloat(food.calories || 0);

            // 사용자의 식사 기록에 이 음식 이름이 포함되어 있는지 확인 (공백 제거 후 매칭)
            if (foodName && normalizedInput.includes(foodName.replace(/\s+/g, '').toLowerCase())) {
                matchedItems.push({
                    item: foodName,
                    amount: foodAmount,
                    calories: calories
                });
                ingestedCals += calories;
            }
        });

    } catch (error) {
        console.error("Supabase 데이터 로드 실패:", error);
        return {
            "meal_analysis": [{ item: "데이터베이스 연결 오류", amount: "1", calories: 0 }],
            "total_ingested_calories": 0,
            "daily_target_calories": targetCals,
            "status": "오류",
            "coach_feedback": "Supabase 데이터베이스를 불러오는 데 실패했습니다. 인터넷 연결이나 DB 설정을 확인해주세요."
        };
    }

    if (matchedItems.length === 0) {
        return {
            "meal_analysis": [{ item: "인식된 음식 없음", amount: "-", calories: 0 }],
            "total_ingested_calories": 0,
            "daily_target_calories": targetCals,
            "status": "알 수 없음",
            "coach_feedback": "입력하신 식사 내용에서 데이터베이스에 등록된 음식을 찾지 못했습니다. 보다 구체적인 음식명을 입력해보세요."
        };
    }

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
    const cameraBtn = document.getElementById('camera-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImgBtn = document.getElementById('remove-img-btn');

    // 카메라 버튼 클릭 시 파일 선택창 열기
    cameraBtn.addEventListener('click', () => {
        imageUpload.click();
    });

    // 파일 선택 시 프리뷰 표시
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreviewContainer.classList.remove('hidden');

                // 사진을 올리면 텍스트 입력창 안내
                mealInput.value = "";
                mealInput.placeholder = "AI가 사진 속 음식을 분석 중입니다... 🔍";

                // 실제 Gemini Vision API 연동
                analyzeImageWithGemini(file);
            };
            reader.readAsDataURL(file);
        }
    });

    // 사진 삭제
    removeImgBtn.addEventListener('click', () => {
        imageUpload.value = '';
        imagePreview.src = '';
        imagePreviewContainer.classList.add('hidden');
        mealInput.value = '';
        mealInput.placeholder = "당신의 식사를 기록해보세요...";
    });

    analyzeBtn.addEventListener('click', async () => {
        const mealText = mealInput.value.trim();
        // 사진이 있고 텍스트가 없는 경우에도 분석이 가능하도록 로직 보완 예정
        if (!mealText && imagePreviewContainer.classList.contains('hidden')) {
            alert("드신 음식을 입력하거나 사진을 올려주세요!");
            return;
        }

        // 1. 프로필 정보 가져오기
        const height = parseFloat(document.getElementById('height').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const age = parseInt(document.getElementById('age').value);
        const gender = document.getElementById('gender').value;
        const activity = parseFloat(document.getElementById('activity').value);

        // 2. TDEE 계산 (권장 칼로리)
        const targetCals = calculate_tdee(height, weight, age, gender, activity);

        // UI Loading
        btnLoader.classList.remove('hidden');
        analyzeBtn.disabled = true;

        // 3. 분석 수행 (Supabase 버전)
        const analysis = await localDataAnalysis(mealText, targetCals);

        // UI Update
        renderResults(analysis);
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });

        btnLoader.classList.add('hidden');
        analyzeBtn.disabled = false;
    });
});

/**
 * 📸 Gemini Vision API를 이용한 실제 이미지 분석
 */
async function analyzeImageWithGemini(file) {
    const GEMINI_API_KEY = "AIzaSyCMSZZp8kI88hP_GY_Ul3gpJWK1i_7i-LA";
    const mealInput = document.getElementById('meal-input');
    const analyzeBtn = document.getElementById('analyze-btn');

    // 분석 중 UI 업데이트
    analyzeBtn.disabled = true;
    const originalBtnHTML = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<span><i class="fa-solid fa-spinner fa-spin"></i> 사진 분석 중...</span>';

    try {
        const base64Data = await fileToBase64(file);
        const base64Content = base64Data.split(',')[1];
        const mimeType = file.type;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "당신은 AI 영양사입니다. 이 사진에 있는 음식들을 분석하여 정확한 한국어 음식 명칭만 쉼표(,)로 구분하여 나열해주세요. 예: 제육볶음, 공기밥, 된장찌개. 부연 설명이나 인사는 절대로 하지 마세요." },
                        { inline_data: { mime_type: mimeType, data: base64Content } }
                    ]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
            const aiText = result.candidates[0].content.parts[0].text.trim();
            mealInput.value = aiText;
            mealInput.placeholder = "사진 분석 완료! [AI 분석하기]를 눌러보세요.";
        } else {
            throw new Error("분석 결과가 없습니다.");
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        alert("사진 분석 중 오류가 발생했습니다. 직접 입력해 주시거나 다시 시도해 주세요.");
        mealInput.placeholder = "분석 실패: 직접 입력을 권장합니다.";
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalBtnHTML;
    }
}

/**
 * 파일을 Base64로 변환하는 헬퍼 함수
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function renderResults(data) {
    document.getElementById('target-cal').textContent = Math.round(data.daily_target_calories).toLocaleString();
    document.getElementById('ingested-cal').textContent = Math.round(data.total_ingested_calories).toLocaleString();

    const remaining = data.daily_target_calories - data.total_ingested_calories;
    document.getElementById('remaining-cal').textContent = Math.round(remaining).toLocaleString();

    const percent = Math.min(100, Math.round((data.total_ingested_calories / data.daily_target_calories) * 100));
    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('progress-fill').style.width = `${percent}%`;

    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = data.status;
    statusBadge.className = 'badge ' + (data.status === '적정' ? 'success' : (data.status === '부족' ? 'warning' : 'danger'));

    const mealList = document.getElementById('meal-list');
    mealList.innerHTML = '';
    data.meal_analysis.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="food-name">${item.item}</span>
            <span class="food-amount">${item.amount}</span>
            <span class="food-cal">${item.calories} kcal</span>
        `;
        mealList.appendChild(li);
    });

    document.getElementById('coach-text').textContent = data.coach_feedback;
}
