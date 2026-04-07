// using var to work around a WebKit bug
var canvas = document.getElementById('canvas'); // eslint-disable-line

const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const gl = canvas.getContext('webgl', {antialiasing: false});

const wind = window.wind = new WindGL(gl);

function frame() {
    if (wind.windData) {
        wind.draw();
    }
    requestAnimationFrame(frame);
}
frame();
const center = [114.17, 22.35]; 
const zoomLevel = 400.0; // Higher = more zoomed in

// 2. Pass them to the shader as uniforms
const program = wind.drawProgram;
gl.useProgram(program.program);

// u_offset is the negative of the center to "pull" HK to (0,0)
gl.uniform2f(program.u_offset, -center[0], -center[1]);
gl.uniform1f(program.u_zoom, zoomLevel);

const gui = new dat.GUI();
gui.add(wind, 'numParticles', 1024, 589824);
gui.add(wind, 'fadeOpacity', 0.96, 0.999, 0.001).updateDisplay();
gui.add(wind, 'speedFactor', 0.05, 1.0);
gui.add(wind, 'dropRate', 0, 0.1);
gui.add(wind, 'dropRateBump', 0, 0.2);

const windFiles = {
    0: '2026040612_00',
    24: '2026040612_24',
    48: '2026040612_48'
};

const meta = {
    'zoom': 2,
    '2026-04-06+12Z': 0,
    'retina resolution': true,
    'github.com/mapbox/webgl-wind': function () {
        window.location = 'https://github.com/mapbox/webgl-wind';
    }
};

gui.add(meta, 'zoom', 2, 10, 0.01).onChange(updateZoom);
gui.add(meta, '2026-04-06+12Z', 0, 48, 24).onFinishChange(updateWind);

if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}

gui.add(meta, 'github.com/mapbox/webgl-wind');

updateWind(0);
updateRetina();

function updateZoom() {
    const halfSize = 0.5 / Math.pow(2, meta.zoom);
    wind.setView([
        0.8171 - halfSize,
        0.62 - halfSize,
        0.8171 + halfSize,
        0.62 + halfSize
    ]);
    drawCoastline();
    wind.resize();
    wind.numParticles = wind.numParticles;
}

function updateRetina() {
    const ratio = meta['retina resolution'] ? pxRatio : 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    wind.resize();
}

let coastlineFeatures;

getJSON('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_coastline.geojson', function (data) {
    coastlineFeatures = data.features;
    drawCoastline();
});

function drawCoastline() {
    const canvas = document.getElementById('coastline');
    canvas.width = canvas.clientWidth * pxRatio;
    canvas.height = canvas.clientHeight * pxRatio;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = pxRatio;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.beginPath();

    for (let i = 0; i < coastlineFeatures.length; i++) {
        const line = coastlineFeatures[i].geometry.coordinates;
        for (let j = 0; j < line.length; j++) {
            const x = (line[j][0] + 180) / 360;
            const y = latY(line[j][1]);
            const minX = wind.bbox[0];
            const minY = latY(180 * wind.bbox[3] - 90);
            const maxX = wind.bbox[2];
            const maxY = latY(180 * wind.bbox[1] - 90);
            ctx[j ? 'lineTo' : 'moveTo'](
                (x - minX) / (maxX - minX) * canvas.width,
                (y - minY) / (maxY - minY) * canvas.height);
        }
    }
    ctx.stroke();
}

function updateWind(name) {
    getJSON('wind/' + windFiles[name] + '.json', function (windData) {
        const windImage = new Image();
        windImage.src = 'wind/' + windFiles[name] + '.png';
        windImage.onload = function () {
            // Must define the geographic bounds of the wind image
            wind.bbox = windData.bbox || [113.8, 22.1, 114.5, 22.6]; 
            wind.setWind(windData, windImage);
            updateZoom();
        };
    });
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

function latY(lat) {
    const sin = Math.sin(lat * Math.PI / 180),
        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
    return y < 0 ? 0 :
           y > 1 ? 1 : y;
}
