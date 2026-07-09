// 初始化地圖（中心點設在臺灣與西北太平洋海域）
const map = L.map('map').setView([22.0, 125.0], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markerGroup = L.layerGroup().addTo(map);

async function loadTyphoonData() {
    const infoDiv = document.getElementById('typhoonInfo');
    
    try {
        // 直接讀取 GitHub 產生的靜態檔案
        const response = await fetch('./typhoon.json');
        if (!response.ok) throw new Error('尚未產生颱風資料，或無即時颱風資料。');
        
        const data = await response.json();
        
        if (!data.cwaopendata || !data.cwaopendata.dataset) {
            infoDiv.innerHTML = '<p class="text-emerald-600 font-medium">☀️ 目前西北太平洋區域暫無即時颱風或熱帶低壓警報。</p>';
            return;
        }

        const paragraphs = data.cwaopendata.dataset.resource.cwaData.resources.resource.data.paragraphs.paragraph;
        let htmlContent = '';
        let hasLocation = false;

        paragraphs.forEach(p => {
            htmlContent += `
                <div class="p-4 bg-indigo-50/60 rounded-lg border border-indigo-100 hover:shadow-sm transition-all">
                    <strong class="text-indigo-900 text-base">${p.target || '颱風即時消息'}</strong>
                    <p class="text-gray-600 mt-2 text-sm leading-relaxed">${p.contentText}</p>
                </div>`;

            // 正則表達式自動抓取文字中的「北緯 XX 度，東經 XX 度」
            const latMatch = p.contentText.match(/北緯\s*([\d.]+)\s*度/);
            const lngMatch = p.contentText.match(/東經\s*([\d.]+)\s*度/);

            if (latMatch && lngMatch) {
                const lat = parseFloat(latMatch[1]);
                const lng = parseFloat(lngMatch[1]);
                hasLocation = true;

                // 在地圖上釘上颱風圖標
                L.marker([lat, lng])
                    .bindPopup(`<div class="p-1"><b>${p.target || '颱風中心'}</b><br><span class="text-xs text-gray-500">位置：北緯 ${lat}度, 東經 ${lng}度</span></div>`)
                    .addTo(markerGroup);

                // 將地圖焦點移過去
                map.setView([lat, lng], 5);
            }
        });

        infoDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error(error);
        infoDiv.innerHTML = `
            <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                ⚠️ 提示：${error.message}<br><span class="text-xs text-gray-400">若剛部署，請等待 GitHub Actions 首次抓取完成（約需 1 分鐘）。</span>
            </div>`;
    }
}

// 網頁載入時啟動
window.onload = loadTyphoonData;
