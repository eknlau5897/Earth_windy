// using var to work around a WebKit bug
var canvas = document.getElementById('canvas'); // eslint-disable-line

const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const gl = canvas.getContext('webgl', {antialiasing: false});

const wind = window.wind = new WindGL(gl);
wind.numParticles = 65536;

function frame() {
    if (wind.windData) {
        wind.draw();
    }
    requestAnimationFrame(frame);
}
frame();

const gui = new dat.GUI();
gui.add(wind, 'numParticles', 1024, 589824);
gui.add(wind, 'fadeOpacity', 0.96, 0.999).step(0.001).updateDisplay();
gui.add(wind, 'speedFactor', 0.05, 1.0);
gui.add(wind, 'dropRate', 0, 0.1);
gui.add(wind, 'dropRateBump', 0, 0.2);

const windFiles = {
    0: '2026041906_000',
    6: '2026041906_006',
    12: '2026041906_012',
    18: '2026041906_018',
    24: '2026041906_024',
    30: '2026041906_030',
    36: '2026041906_036',
    42: '2026041906_042',
    48: '2026041906_048',
    54: '2026041906_054',
    60: '2026041906_060',
    66: '2026041906_066',
    72: '2026041906_072',
    78: '2026041906_078',
    84: '2026041906_084',
    90: '2026041906_090',
    96: '2026041906_096',
    102: '2026041906_102',
    108: '2026041906_108',
    114: '2026041906_114',
    120: '2026041906_120'
};

const meta = {
    '2026-04-19+06Z': 0,
    'retina resolution': true,
    'GFS 100m wind':'you are viewing GFS 100m wind',
    'change forecast': function () {
        window.location = 'http://zax41006-bot.github.io/GHMWS/animation.html';
    }

};
gui.add(meta, '2026-04-19+06Z', 0, 120, 6).onFinishChange(updateWind);
if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}
gui.add(meta, 'GFS 100m wind');
gui.add(meta, 'change forecast');
updateWind(0);
updateRetina();

// 1. 先定義 PressureLayer 類別
class PressureLayer {
    constructor(gl) {
        this.gl = gl;
        this.textures = {}; // 用於存放 21 張氣壓圖
        this.program = createProgram(gl, contourVS, contourFS); // 使用剛才的 Shader
        this.initBuffer();
    }

    initBuffer() {
        const gl = this.gl;
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        // 建立一個覆蓋全屏的矩形
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    }

    // 預載入所有圖片 (currentHour: 000, 006...)
    async loadAllTextures() {
        const hours = Array.from({length: 21}, (_, i) => (i * 6).toString().padStart(3, '0'));
        for (let hh of hours) {
            const imgUrl = `pressure_frames/p_${hh}.png`;
            this.textures[hh] = await loadTexture(this.gl, imgUrl);
        }
    }

    draw(currentHour) {
        const gl = this.gl;
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        // 設定頂點座標
        const posLoc = gl.getAttribLocation(this.program, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // 綁定對應小時的紋理
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[currentHour]);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_pressure_tex"), 0);
        gl.uniform1f(gl.getUniformLocation(this.program, "u_opacity"), 0.7);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

// 2. 【關鍵修正】實例化對象
// 確保在 gl 上下文創建後執行
const pressureLayer = new PressureLayer(gl);

function frame() {
    if (!wind.stopped) {
        requestAnimationFrame(frame);
    }

    // --- 這裡插入氣壓層渲染 ---
    // 假設你的風場當前小時變數是 fhour (如 "120")
    if (pressureLayer) {
        // 先畫氣壓，它會填滿背景
        pressureLayer.draw(fhour, settings); 
    }
    if (wind.windData) {
        wind.draw();
    }
    requestAnimationFrame(frame);
    drawWind(); 
}
frame();


function updateRetina() {
    const ratio = meta['retina resolution'] ? pxRatio : 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    wind.resize();
}

getJSON('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_coastline.geojson', function (data) {
    const canvas = document.getElementById('coastline');
    canvas.width = canvas.clientWidth * pxRatio;
    canvas.height = canvas.clientHeight * pxRatio;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = pxRatio;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.beginPath();

    for (let i = 0; i < data.features.length; i++) {
        const line = data.features[i].geometry.coordinates;
        for (let j = 0; j < line.length; j++) {
            ctx[j ? 'lineTo' : 'moveTo'](
                (line[j][0] + 180) * canvas.width / 360,
                (-line[j][1] + 90) * canvas.height / 180);
        }
    }
    ctx.stroke();
});

function updateWind(hour) {
    // 1. 更新風場數據 (原本的邏輯)
    fetch(`./wind/${date}${time}_${hour}.json`)
        .then(res => res.json())
        .then(data => {
            wind.setWind(data);
        });

    // 2. 同步載入並連結氣壓紋理
    pressureLayer.loadFrame(hour); 
}

function getJSON(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('get', url, true);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(xhr.response);
        } else {
            throw new Error(xhr.statusText);
        }
    };
    xhr.send();
}
