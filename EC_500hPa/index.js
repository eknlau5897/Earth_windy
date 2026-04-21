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
    0: '2026042100_000_500',
    6: '2026042100_006_500',
    12: '2026042100_012_500',
    18: '2026042100_018_500',
    24: '2026042100_024_500',
    30: '2026042100_030_500',
    36: '2026042100_036_500',
    42: '2026042100_042_500',
    48: '2026042100_048_500',
    54: '2026042100_054_500',
    60: '2026042100_060_500',
    66: '2026042100_066_500',
    72: '2026042100_072_500',
    78: '2026042100_078_500',
    84: '2026042100_084_500',
    90: '2026042100_090_500',
    96: '2026042100_096_500',
    102: '2026042100_102_500',
    108: '2026042100_108_500',
    114: '2026042100_114_500',
    120: '2026042100_120_500'
};

const meta = {
    '2026-04-21+00Z': 0,
    'retina resolution': true,
    'EC 500 wind':'you are viewing EC 500hPa wind',
    'change forecast': function () {
        window.location = 'http://zax41006-bot.github.io/GHMWS/animation.html';
    }

};
gui.add(meta, '2026-04-21+00Z', 0, 120, 6).onFinishChange(updateWind);
if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}
gui.add(meta, 'EC 500 wind');
gui.add(meta, 'change forecast');
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
