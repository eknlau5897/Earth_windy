// using var to work around a WebKit bug
const contourVS = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
        v_uv = a_pos * 0.5 + 0.5;
        v_uv.y = 1.0 - v_uv.y;
        gl_Position = vec4(a_pos, 0.0, 1.0);
    }
`;

const contourFS = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_pressure_tex;
    uniform float u_opacity;
    void main() {
        float p = texture2D(u_pressure_tex, v_uv).g;
        float level = p / 0.04; 
        float line = smoothstep(0.2 + fwidth(level), 0.2, abs(fract(level) - 0.5));
        vec3 bgColor = vec3(0.05, 0.07, 0.12);
        gl_FragColor = vec4(mix(bgColor, vec3(0.4, 0.6, 0.9), line * 0.5), u_opacity);
    }
`;

// --- 2. 補齊 Helper 函數 ---
function createProgram(gl, vsSource, fsSource) {
    const program = gl.createProgram();
    const vShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vShader, vsSource);
    gl.compileShader(vShader);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fShader, fsSource);
    gl.compileShader(fShader);
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

function loadTexture(gl, url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            resolve(tex);
        };
        img.src = url;
    });
}

// --- 3. 修改後的 PressureLayer 類別 ---
class PressureLayer {
    constructor(gl) {
        this.gl = gl;
        gl.getExtension('OES_standard_derivatives');
        this.textures = {};
        this.program = createProgram(gl, contourVS, contourFS);
        this.initBuffer();
    }

    initBuffer() {
        const gl = this.gl;
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    }

    async loadFrame(hour) {
        const fhour = hour.toString().padStart(3, '0');
        if (this.textures[fhour]) return;
        const imgUrl = `pressure_frames/p_${fhour}.png`;
        this.textures[fhour] = await loadTexture(this.gl, imgUrl);
    }

    draw(hour) {
        const fhour = hour.toString().padStart(3, '0');
        const gl = this.gl;
        if (!this.textures[fhour]) return;

        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        const posLoc = gl.getAttribLocation(this.program, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[fhour]);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_pressure_tex"), 0);
        gl.uniform1f(gl.getUniformLocation(this.program, "u_opacity"), 0.7);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

// --- 4. 主流程初始化 ---
const canvas = document.getElementById('canvas');
const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const gl = canvas.getContext('webgl', {antialiasing: false});
const wind = window.wind = new WindGL(gl);
wind.numParticles = 65536;

const pressureLayer = new PressureLayer(gl);

// 修正後的 frame 函數
function frame() {
    if (wind.stopped) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // 1. 先畫氣壓層 (關閉混合以防粒子殘影干擾背景)
    gl.disable(gl.BLEND);
    pressureLayer.draw(meta['2026-04-19+06Z']);

    // 2. 開啟混合畫風場粒子
    gl.enable(gl.BLEND);
    if (wind.windData) {
        wind.draw();
    }
    
    requestAnimationFrame(frame);
}

// 修正後的 updateWind 函數
function updateWind(hour) {
    const fhour = hour.toString().padStart(3, '0');
    // 下載 JSON (假設目錄在 ./wind/)
    getJSON(`./wind/2026041906_${fhour}.json`, (data) => {
        wind.setWind(data);
    });

    // 同步下載氣壓紋理
    pressureLayer.loadFrame(hour);
}

// GUI 設定
const meta = {
    '2026-04-19+06Z': 0,
    'retina resolution': true,
    'GFS 100m wind': 'you are viewing GFS 100m wind',
    'change forecast': function () {
        window.location = 'http://zax41006-bot.github.io/GHMWS/animation.html';
    }
};

const gui = new dat.GUI();
gui.add(meta, '2026-04-19+06Z', 0, 120, 6).onFinishChange(updateWind);
gui.add(wind, 'numParticles', 1024, 589824);
gui.add(wind, 'fadeOpacity', 0.96, 0.999).step(0.001).updateDisplay();
gui.add(wind, 'speedFactor', 0.05, 1.0);
gui.add(wind, 'dropRate', 0, 0.1);
gui.add(wind, 'dropRateBump', 0, 0.2);

// 啟動
updateWind(0);
frame();