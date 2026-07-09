const map = L.map('map').setView([22.0, 125.0], 5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO'
}).addTo(map);

const pathGroup = L.layerGroup().addTo(map);

async function loadTyphoonPath() {
    const infoDiv = document.getElementById('typhoonInfo');
    
    try {
        const response = await fetch('./typhoon.json');
        if (!response.ok) throw new Error('尚未產生颱風資料或檔案讀取失敗。');
        
        const data = await response.json();
        
        if (!data.cwaopendata || !data.cwaopendata.dataset || !data.cwaopendata.dataset.typhoons) {
            infoDiv.innerHTML = '<p class="text-emerald-600 font-medium">☀️ 目前西北太平洋區域暫無即時颱風走向資料。</p>';
            return;
        }

        const typhoonList = data.cwaopendata.dataset.typhoons.typhoon;
        // 支援多個颱風同時存在，若非陣列則轉為陣列
        const typhoons = Array.isArray(typhoonList) ? typhoonList : [typhoonList];
        
        let htmlContent = '';
        pathGroup.clearLayers(); // 清除舊圖資

        typhoons.forEach(typhoon => {
            const nameInfo = typhoon.typhoonName + (typhoon.localTyphoonName ? ` (${typhoon.localTyphoonName})` : '');
            
            htmlContent += `
                <div class="p-4 bg-slate-800 text-white rounded-lg border border-slate-700 mb-4 shadow-md">
                    <h3 class="text-lg font-bold text-yellow-400">🌀 ${nameInfo}</h3>
                    <p class="text-xs text-slate-400 mt-1">目前強度：${typhoon.analysis.intensity || '未提供'}</p>
                    <div class="mt-3 text-xs space-y-1 text-slate-300">
            `;

            // --- 1. 繪製過去歷史路徑 ---
            let historyCoords = [];
            if (typhoon.history && typhoon.history.point) {
                const historyPoints = Array.isArray(typhoon.history.point) ? typhoon.history.point : [typhoon.history.point];
                
                historyPoints.forEach(pt => {
                    const lat = parseFloat(pt.coordinate.split(',')[1]);
                    const lng = parseFloat(pt.coordinate.split(',')[0]);
                    historyCoords.push([lat, lng]);

                    // 在歷史點點上灰色小圓點
                    L.circleMarker([lat, lng], {
                        color: '#94a3b8',
                        radius: 4,
                        fillOpacity: 0.8
                    }).addTo(pathGroup).bindPopup(`歷史位置<br>時間：${pt.time}<br>風速：${pt.maxWindSpeed} m/s`);
                });

                // 用灰色實線連起來
                L.polyline(historyCoords, {
                    color: '#64748b',
                    weight: 3,
                    opacity: 0.7
                }).addTo(pathGroup);
            }

            // --- 2. 繪製目前最新位置 ---
            const current = typhoon.analysis;
            const curLat = parseFloat(current.coordinate.split(',')[1]);
            const curLng = parseFloat(current.coordinate.split(',')[0]);
            
            htmlContent += `
                <p>📍 目前位置：北緯 ${curLat}°, 東經 ${curLng}°</p>
                <p>💨 中心風速：${current.maxWindSpeed} m/s</p>
                <p>📉 中心氣壓：${current.pressure} hPa</p>
                </div></div>
            `;

            // 颱風當前中心用大紅點表示
            const currentMarker = L.circleMarker([curLat, curLng], {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.8,
                radius: 10
            }).addTo(pathGroup).bindPopup(`<b>${nameInfo} 目前中心</b><br>風速：${current.maxWindSpeed} m/s<br>氣壓：${current.pressure} hPa`).openPopup();

            // 將地圖焦點移到當前颱風中心
            map.setView([curLat, curLng], 5);

            // --- 3. 繪製未來預報走向 ---
            let forecastCoords = [[curLat, curLng]]; // 預報線要從目前位置開始連
            if (typhoon.forecast && typhoon.forecast.point) {
                const forecastPoints = Array.isArray(typhoon.forecast.point) ? typhoon.forecast.point : [typhoon.forecast.point];
                
                forecastPoints.forEach(pt => {
                    const lat = parseFloat(pt.coordinate.split(',')[1]);
                    const lng = parseFloat(pt.coordinate.split(',')[0]);
                    forecastCoords.push([lat, lng]);

                    // 未來預報點用橘色圈圈表示
                    L.circleMarker([lat, lng], {
                        color: '#f97316',
                        radius: 6,
                        fillOpacity: 0.5
                    }).addTo(pathGroup).bindPopup(`未來預報點<br>預計時間：${pt.time}<br>預估風速：${pt.maxWindSpeed} m/s`);
                });

                // 用橘色「虛線 (dashArray)」表示未來的預測走向！
                L.polyline(forecastCoords, {
                    color: '#f97316',
                    weight: 4,
                    dashArray: '5, 10',
                    opacity: 0.9
                }).addTo(pathGroup);
            }
        });

        infoDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error(error);
        infoDiv.innerHTML = `<div class="p-4 bg-amber-900/50 text-amber-200 rounded-lg text-sm">⚠️ 載入失敗：${error.message}</div>`;
    }
}

window.onload = loadTyphoonPath;
