// 初始化地圖（中心點設在臺灣與西北太平洋海域）
const map = L.map('map').setView([22.0, 125.0], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markerGroup = L.layerGroup().addTo(map);

async function loadTyphoonData() {
    const infoDiv = document.getElementById('typhoonInfo');
    
    try {
        // 讀取 GitHub Actions 抓下來的靜態檔案
        const response = await fetch('./typhoon.json');
        if (!response.ok) throw new Error('尚未產生颱風資料，或檔案讀取失敗。');
        
        const data = await response.json();
        
        // 防呆機制：檢查資料結構是否存在
        if (!data.cwaopendata || !data.cwaopendata.dataset) {
            infoDiv.innerHTML = '<p class="text-emerald-600 font-medium">☀️ 目前西北太平洋區域暫無即時颱風或熱帶低壓警報。</p>';
            return;
        }

        // 取得颱風警報的主要資料集
        const dataset = data.cwaopendata.dataset;
        let htmlContent = '';
        let hasTyphoon = false;

        // 1. 理論上氣象署在有警報時，會將詳細資料存在資訊欄或 paragraphs 中
        if (dataset.resource && dataset.resource.cwaData && dataset.resource.cwaData.resources) {
            const paragraphs = dataset.resource.cwaData.resources.resource.data.paragraphs.paragraph;
            
            paragraphs.forEach(p => {
                hasTyphoon = true;
                htmlContent += `
                    <div class="p-4 bg-red-50 rounded-lg border border-red-100 hover:shadow-sm transition-all mb-3">
                        <strong class="text-red-900 text-base">⚠️ ${p.target || '颱風即時警報'}</strong>
                        <p class="text-gray-600 mt-2 text-sm leading-relaxed">${p.contentText}</p>
                    </div>`;

                // 精準匹配文字中的經緯度（支援「北緯 21.5 度」、「東經 122.1 度」等格式）
                const latMatch = p.contentText.match(/北緯\s*([\d.]+)\s*度/);
                const lngMatch = p.contentText.match(/東經\s*([\d.]+)\s*度/);

                if (latMatch && lngMatch) {
                    const lat = parseFloat(latMatch[1]);
                    const lng = parseFloat(lngMatch[1]);

                    // 自訂一個醒目的紅色圓圈標記代表颱風中心
                    L.circleMarker([lat, lng], {
                        color: 'red',
                        fillColor: '#f03',
                        fillOpacity: 0.5,
                        radius: 12
                    }).addTo(markerGroup)
                      .bindPopup(`<div class="p-1"><b>${p.target || '颱風中心'}</b><br><span class="text-xs text-gray-500">位置：北緯 ${lat}° , 東經 ${lng}°</span></div>`)
                      .openPopup(); // 自動打開彈出視窗

                    // 將地圖焦點中心移至颱風位置
                    map.setView([lat, lng], 6);
                }
            });
        }

        // 2. 如果上述欄位沒抓到，嘗試解析傳統文字格式（相容舊格式防呆）
        if (!hasTyphoon && dataset.infos && dataset.infos.info) {
            const infos = Array.isArray(dataset.infos.info) ? dataset.infos.info : [dataset.infos.info];
            infos.forEach(info => {
                hasTyphoon = true;
                htmlContent += `
                    <div class="p-4 bg-amber-50 rounded-lg border border-amber-100 mb-3">
                        <strong class="text-amber-900 text-base">🌀 颱風動態消息</strong>
                        <p class="text-gray-600 mt-2 text-sm">${info.memo || '請查看氣象署詳細公告'}</p>
                    </div>`;
            });
        }

        // 如果真的完全沒有颱風資訊
        if (!hasTyphoon) {
            infoDiv.innerHTML = '<p class="text-emerald-600 font-medium">☀️ 目前西北太平洋區域暫無即時颱風或熱帶低壓警報。</p>';
        } else {
            infoDiv.innerHTML = htmlContent;
        }

    } catch (error) {
        console.error(error);
        infoDiv.innerHTML = `
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                ⚠️ 提示：${error.message}<br><span class="text-xs text-gray-400">請確認專案目錄下的 typhoon.json 是否存在且格式正確。</span>
            </div>`;
    }
}

// 網頁載入時啟動
window.onload = loadTyphoonData;
