precision highp float;

// 從頂點著色器傳來的 UV 坐標 (0.0 到 1.0)
varying vec2 v_uv;

// 氣壓紋理 (G 通道存儲歸一化的氣壓數據)
uniform sampler2D u_pressure_tex;

// 控制參數
uniform float u_opacity;    // 等壓線整體透明度 (建議 0.5 - 0.8)

void main() {
    // 1. 從紋理的 Green 通道讀取歸一化氣壓 (0.0 - 1.0)
    // 假設我們之前 Python 映射 950hPa=0, 1050hPa=1.0
    float pressure = texture2D(u_pressure_tex, v_uv).g;

    // 2. 定義等壓線間隔
    // 如果總量是 100hPa，0.04 代表每 4hPa 一條線 (1.0 / 25 階)
    float interval = 0.04; 
    
    // 3. 計算當前所在的層級
    float level = pressure / interval;
    
    // 4. 計算線條遮罩 (Line Mask)
    // fract(level) 會在接近整數（即等壓線位置）時產生 0 到 1 的循環
    // 我們取其與中心點 (0.5) 的距離來確定線條位置
    float dist = abs(fract(level) - 0.5);
    
    // 5. 使用標準導數 (Standard Derivatives) 進行抗鋸齒
    // 這是讓線條在任何縮放比例下都保持平滑的關鍵
    float delta = fwidth(level);
    float thickness = 0.2; // 基礎線條粗細
    
    // 繪製細等壓線
    float line = smoothstep(thickness + delta, thickness, dist);

    // 6. 主壓線加粗 (每 5 條線加粗一次，例如 1000, 1020hPa)
    float majorLevel = pressure / (interval * 5.0);
    float majorDist = abs(fract(majorLevel) - 0.5);
    float majorLine = smoothstep(0.15 + fwidth(majorLevel), 0.15, majorDist);

    // 7. 定義顏色
    vec3 backgroundBlue = vec3(0.05, 0.07, 0.12); // 深底色
    vec3 contourColor = vec3(0.4, 0.6, 0.9);      // 等壓線淺藍色
    vec3 majorColor = vec3(1.0, 1.0, 1.0);        // 主壓線白色

    // 8. 最終色彩合成
    // 先合成細線
    vec3 color = mix(backgroundBlue, contourColor, line * 0.4);
    // 再疊加主壓線
    color = mix(color, majorColor, majorLine * 0.3);

    // 輸出，a 通道可根據需要調整
    gl_FragColor = vec4(color, u_opacity);
}

