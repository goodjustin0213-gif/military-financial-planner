// =========================================================
// MOCK DATA: 國軍各階級模擬薪資 (簡化數據，需替換為真實資料庫)
// S2: 少尉, S3: 中尉, S4: 上尉, M1: 少校, M2: 中校, M3: 上校
// 數值為月薪總額 (包含本俸、專業加給等，單位：新台幣 元)
// 假設每年薪資微幅成長 1.5% 作為基礎調整
// =========================================================
const SALARY_MOCK_DATA = {
    'S2': 51000, // 少尉起薪
    'S3': 54000,
    'S4': 60000,
    'M1': 70000, // 少校 (約 10-14 年)
    'M2': 85000,
    'M3': 100000 // 上校 (約 20 年後)
};

// 階級晉升年限假設
const PROMOTION_YEARS = {
    'S2': 3, // 少尉 3 年後晉升中尉
    'S3': 4, // 中尉 4 年後晉升上尉
    'S4': 7, // 上尉 7 年後晉升少校
    'M1': 6, // 少校 6 年後晉升中校
    'M2': 6, // 中校 6 年後晉升上校
    'M3': Infinity
};

let financialChartInstance;
let scenarioChartInstance;

/**
 * 執行核心財務模擬運算
 */
function runSimulation() {
    // 1. 取得使用者輸入參數
    const startRank = document.getElementById('startRank').value;
    const serviceYears = parseInt(document.getElementById('serviceYears').value);
    const savingsRate = parseFloat(document.getElementById('savingsRate').value) / 100; // 轉為比例
    const returnRate = parseFloat(document.getElementById('returnRate').value) / 100; // 轉為比例
    const livingCost = parseInt(document.getElementById('livingCost').value);
    const loanRate = parseFloat(document.getElementById('loanRate').value) / 100; // 轉為比例

    if (!serviceYears || savingsRate === undefined || returnRate === undefined) {
        document.getElementById('simulation-status').innerText = '請確認所有數值輸入正確。';
        document.getElementById('simulation-status').classList.remove('hidden');
        return;
    }
    document.getElementById('simulation-status').classList.add('hidden');

    // 2. 核心計算迴圈
    let currentAsset = 0;
    let currentRank = startRank;
    let yearOfRank = 0; // 當前階級的服役年數
    
    const years = [];
    const monthlySalaryData = [];
    const totalAssetData = [];
    const netCashFlowData = [];
    
    for (let year = 1; year <= serviceYears; year++) {
        years.push(`第 ${year} 年`);

        // 檢查晉升
        if (yearOfRank >= PROMOTION_YEARS[currentRank]) {
            // 晉升邏輯 (簡化: 僅依序晉升，實際需考慮升遷卡關)
            const ranks = Object.keys(SALARY_MOCK_DATA);
            const nextRankIndex = ranks.indexOf(currentRank) + 1;
            if (nextRankIndex < ranks.length) {
                currentRank = ranks[nextRankIndex];
                yearOfRank = 0; // 晉升後年數重置
            }
        }
        
        // 獲取當前月薪 (基礎薪資 + 每年 1.5% 基礎成長)
        let monthlySalary = SALARY_MOCK_DATA[currentRank] * (1 + 0.015) ** (year - 1);
        monthlySalary = Math.round(monthlySalary / 100) * 100; // 四捨五入到百位
        
        const annualSalary = monthlySalary * 12;
        monthlySalaryData.push(monthlySalary);

        // 年度儲蓄與投資金額
        const annualSavingsInvestment = (monthlySalary * savingsRate) * 12;

        // 淨現金流 (簡化：年薪 - (生活費 * 12))
        const annualLivingCost = livingCost * 12;
        const netCashFlow = annualSalary - annualLivingCost;
        netCashFlowData.push(netCashFlow);

        // 資產累積計算 (複利公式: 累積資產 * (1 + 報酬率) + 年度投資)
        currentAsset = currentAsset * (1 + returnRate) + annualSavingsInvestment;
        totalAssetData.push(Math.round(currentAsset));
        
        yearOfRank++; // 當前階級年數增加
    }

    // 3. 輸出核心數據
    const finalAsset = totalAssetData[totalAssetData.length - 1];
    const avgMonthlyCashFlow = Math.round(netCashFlowData.reduce((a, b) => a + b, 0) / serviceYears / 12);
    
    document.getElementById('total-asset').innerText = formatCurrency(finalAsset);
    document.getElementById('avg-cashflow').innerText = formatCurrency(avgMonthlyCashFlow);
    
    // 簡化置產能力評估 (假設每月房貸不超過每月淨現金流的 40%)
    const maxMonthlyPayment = avgMonthlyCashFlow * 0.4;
    // 使用房貸公式反推可負擔總額 (P = M * [(1 + r)^n - 1] / [r * (1 + r)^n])
    const monthlyRate = loanRate / 12;
    const loanMonths = 240; // 假設 20 年期
    const powerTerm = (1 + monthlyRate) ** loanMonths;
    const maxAffordableLoan = maxMonthlyPayment * ((powerTerm - 1) / (monthlyRate * powerTerm));
    document.getElementById('afford-loan').innerText = formatCurrency(Math.round(maxAffordableLoan));

    // 4. 繪製圖表
    renderFinancialChart(years, monthlySalaryData, totalAssetData);
    renderScenarioChart(years, serviceYears, monthlySalaryData, livingCost);
}

/**
 * 格式化為貨幣顯示
 */
function formatCurrency(number) {
    if (isNaN(number)) return '--';
    return `NT$ ${number.toLocaleString('zh-TW')}`;
}

/**
 * 繪製薪資與資產走勢圖
 */
function renderFinancialChart(years, salaryData, assetData) {
    if (financialChartInstance) financialChartInstance.destroy();
    
    const ctx = document.getElementById('financialChart').getContext('2d');
    financialChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: '每月薪資 (NT$)',
                    data: salaryData,
                    borderColor: 'rgb(79, 70, 229)', // indigo-600
                    yAxisID: 'y1',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: '累積資產 (NT$)',
                    data: assetData,
                    borderColor: 'rgb(20, 184, 166)', // teal-600
                    yAxisID: 'y2',
                    fill: true,
                    backgroundColor: 'rgba(20, 184, 166, 0.2)',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '月薪 (元)' }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '累積資產總額 (元)' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: { title: { display: true, text: '軍旅生涯財務預測 (薪資與資產)' } }
        }
    });
}

/**
 * 繪製不同情境比較圖 (例如：不同投資報酬率)
 */
function renderScenarioChart(years, serviceYears, baseSalaryData, livingCost) {
    if (scenarioChartInstance) scenarioChartInstance.destroy();

    const lowRate = 0.03; // 低報酬情境 (例如：銀行定存/低風險債券)
    const highRate = 0.08; // 高報酬情境 (例如：積極型股票/ETF)
    const baseRate = parseFloat(document.getElementById('returnRate').value) / 100;

    const calcScenarioAsset = (rate) => {
        let asset = 0;
        const savingsRate = parseFloat(document.getElementById('savingsRate').value) / 100;
        const data = [];
        
        // 為了簡化，使用 baseSalaryData 進行快速計算
        for (let i = 0; i < serviceYears; i++) {
            const annualSavingsInvestment = (baseSalaryData[i] * savingsRate) * 12;
            asset = asset * (1 + rate) + annualSavingsInvestment;
            data.push(Math.round(asset));
        }
        return data;
    };
    
    const baseAsset = calcScenarioAsset(baseRate);
    const lowAsset = calcScenarioAsset(lowRate);
    const highAsset = calcScenarioAsset(highRate);

    const ctx = document.getElementById('scenarioChart').getContext('2d');
    scenarioChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: `低風險資產累積 (報酬率 ${lowRate * 100}%)`,
                    data: lowAsset,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    tension: 0.2,
                },
                {
                    label: `您的假設情境 (報酬率 ${baseRate * 100}%)`,
                    data: baseAsset,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderWidth: 3,
                    tension: 0.2,
                },
                {
                    label: `高風險資產累積 (報酬率 ${highRate * 100}%)`,
                    data: highAsset,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    tension: 0.2,
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            scales: { y: { title: { display: true, text: '累積資產總額 (元)' } } },
            plugins: { title: { display: true, text: '不同投資報酬率下的資產累積情境比較' } }
        }
    });
}

// 系統啟動時顯示提示
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('simulation-status').classList.remove('hidden');
});
