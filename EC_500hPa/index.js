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
    0: '2026_04_1718_000_500',
    6: '2026_04_1718_006_500',
    12: '2026_04_1718_012_500',
    18: '2026_04_1718_018_500',
    24: '2026_04_1718_024_500',
    30: '2026_04_1718_030_500',
    36: '2026_04_1718_036_500',
    42: '2026_04_1718_042_500',
    48: '2026_04_1718_048_500',
    54: '2026_04_1718_054_500',
    60: '2026_04_1718_060_500',
    66: '2026_04_1718_066_500',
    72: '2026_04_1718_072_500',
    78: '2026_04_1718_078_500',
    84: '2026_04_1718_084_500',
    90: '2026_04_1718_090_500',
    96: '2026_04_1718_096_500',
    102: '2026_04_1718_102_500',
    108: '2026_04_1718_108_500',
    114: '2026_04_1718_114_500',
    120: '2026_04_1718_120_500'
};

const meta = {
    '2026-04-17+18Z': 0,
    'retina resolution': true,
    'EC 10m wind':'you are viewing EC 10m wind',
    'change to GFS 100m wind': function () {
        window.location = 'http://eknlau5897.github.io/Earth_windy/GFS_100m/index.html';
    }

};
gui.add(meta, '2026-04-17+18Z', 0, 120, 6).onFinishChange(updateWind);
if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}
gui.add(meta, 'EC 10m wind');
gui.add(meta, 'change to GFS 100m wind');
updateWind(0);
updateRetina();

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

function updateWind(name) {
    getJSON( windFiles[name] + '.json', function (windData) {
        const windImage = new Image();
        windData.image = windImage;
        windImage.src =   windFiles[name] + '.png';
        windImage.onload = function () {
            wind.setWind(windData);
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
