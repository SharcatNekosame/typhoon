// 初始化地圖（中心點設在臺灣與西北太平洋海域，套用免金鑰的質感暗黑底圖）
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
        
        // 核心修正：多層巢狀結構防呆檢查，確保百分之百抓到颱風陣列
        let typhoonData = null;
        if (data.cwaopendata && data.cwaopendata.dataset) {
            const dataset = data.cwaopendata.dataset;
            if (dataset.typhoons && dataset.typhoons.typhoon) {
                typhoonData = dataset.typhoons.typhoon;
            } else if (dataset.typhoon) {
                typhoonData = dataset.typhoon;
            }
        }

        if (!typhoonData) {
            infoDiv.innerHTML = '<p class="text-emerald-400 font-medium">☀️ 目前西北太平洋區域暫無即時颱風走向資料。</p>';
            return;
        }

        // 確保轉換為陣列處理
        const typhoons = Array.isArray(typhoonData) ? typhoonData : [typhoonData];
        
        let htmlContent = '';
        pathGroup.clearLayers(); // 清除舊標記

        typhoons.forEach(typhoon => {
            const nameInfo = (typhoon.typhoonName || '未命名') + (typhoon.localTyphoonName ? ` (${typhoon.localTyphoonName})` : '');
            
            htmlContent += `
                <div class="p-4 bg-slate-800 text-white rounded-lg border border-slate-700 mb-4 shadow-md">
                    <h3 class="text-lg font-bold text-yellow-400">🌀 ${nameInfo}</h3>
                    <p class="text-xs text-slate-400 mt-1">目前強度：${(typhoon.analysis && typhoon.analysis.intensity) || '未提供'}</p>
                    <div class="mt-3 text-xs space-y-1 text-slate-300">
            `;

            // --- 1. 繪製「過去歷史路徑」 ---
            let historyCoords = [];
            if (typhoon.history && typhoon.history.point) {
                const historyPoints = Array.isArray(typhoon.history.point) ? typhoon.history.point : [typhoon.history.point];
                
                historyPoints.forEach(pt => {
                    if (pt.coordinate) {
                        const lat = parseFloat(pt.coordinate.split(',')[1]);
                        const lng = parseFloat(pt.coordinate.split(',')[0]);
                        historyCoords.push([lat, lng]);

                        L.circleMarker([lat, lng], {
                            color: '#94a3b8',
                            radius: 4,
                            fillOpacity: 0.8
                        }).addTo(pathGroup).bindPopup(`歷史位置<br>時間：${pt.time}<br>風速：${pt.maxWindSpeed} m/s`);
                    }
                });

                if (historyCoords.length > 0) {
                    L.polyline(historyCoords, {
                        color: '#64748b',
                        weight: 3,
                        opacity: 0.7
                    }).addTo(pathGroup);
                }
            }

            // --- 2. 繪製「目前最新位置」 ---
            const current = typhoon.analysis;
            if (current && current.coordinate) {
                const curLat = parseFloat(current.coordinate.split(',')[1]);
                const curLng = parseFloat(current.coordinate.split(',')[0]);
                
                htmlContent += `
                    <p>📍 目前位置：北緯 ${curLat}°, 東經 ${curLng}°</p>
                    <p>💨 中心風速：${current.maxWindSpeed || '未提供'} m/s</p>
                    <p>📉 中心氣壓：${current.pressure || '未提供'} hPa</p>
                    </div></div>
                `;

                L.circleMarker([curLat, curLng], {
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.9,
                    radius: 10
                }).addTo(pathGroup).bindPopup(`<b>${nameInfo} 目前中心</b><br>風速：${current.maxWindSpeed} m/s`).openPopup();

                map.setView([curLat, curLng], 5);

                // --- 3. 繪製「未來預報走向」 ---
                let forecastCoords = [[curLat, curLng]];
                if (typhoon.forecast && typhoon.forecast.point) {
                    const forecastPoints = Array.isArray(typhoon.forecast.point) ? typhoon.forecast.point : [typhoon.forecast.point];
                    
                    forecastPoints.forEach(pt => {
                        if (pt.coordinate) {
                            const lat = parseFloat(pt.coordinate.split(',')[1]);
                            const lng = parseFloat(pt.coordinate.split(',')[0]);
                            forecastCoords.push([lat, lng]);

                            L.circleMarker([lat, lng], {
                                color: '#f97316',
                                radius: 6,
                                fillOpacity: 0.5
                            }).addTo(pathGroup).bindPopup(`未來預報點<br>預計時間：${pt.time}`);
                        }
                    });

                    if (forecastCoords.length > 1) {
                        L.polyline(forecastCoords, {
                            color: '#f97316',
                            weight: 4,
                            dashArray: '6, 10',
                            opacity: 0.9
                        }).addTo(pathGroup);
                    }
                }
            }
        });

        infoDiv.innerHTML = htmlContent;

    } catch (error) {
        console.error(error);
        infoDiv.innerHTML = `<div class="p-4 bg-slate-800 text-amber-400 rounded-lg text-sm">⚠️ 資料解析失敗：${error.message}</div>`;
    }
}

window.onload = loadTyphoonPath;
