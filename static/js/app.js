var dropZone = document.getElementById('dropZone');
var dropInner = document.getElementById('dropInner');
var fileInput = document.getElementById('fileInput');
var imagePreview = document.getElementById('imagePreview');
var fileInfo = document.getElementById('fileInfo');
var fileName = document.getElementById('fileName');
var clearBtn = document.getElementById('clearBtn');
var analyzeBtn = document.getElementById('analyzeBtn');
var btnText = document.querySelector('.btn-text');
var btnSpinner = document.getElementById('btnSpinner');
var errorBox = document.getElementById('errorBox');
var emptyState = document.getElementById('emptyState');
var loadingState = document.getElementById('loadingState');
var resultsContent = document.getElementById('resultsContent');

var selectedFile = null;

var plotlyConfig = {
    displayModeBar: false,
    responsive: true
};

var plotlyLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8eaf0', family: 'DM Sans, sans-serif', size: 11 },
    margin: { t: 10, b: 10, l: 10, r: 10 }
};

function fixAge(val) {
    var n = parseFloat(String(val));
    if (isNaN(n)) return 0;
    return Math.abs(Math.round(n));
}

function showSection(el) {
    [emptyState, loadingState, resultsContent].forEach(function(e) {
        e.classList.add('hidden');
    });
    el.classList.remove('hidden');
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

function hideError() {
    errorBox.classList.add('hidden');
}

dropZone.addEventListener('click', function() {
    fileInput.click();
});

dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', function() {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('dragend', function() {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    var f = e.dataTransfer.files[0];
    if (f) loadFile(f);
});

fileInput.addEventListener('change', function() {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

clearBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    resetAll();
});

function loadFile(file) {
    var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
    if (allowed.indexOf(file.type) === -1) {
        showError('Invalid file type. Please use JPG, PNG, WEBP, or BMP.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showError('File too large. Maximum size is 10 MB.');
        return;
    }

    selectedFile = file;
    hideError();

    var reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.classList.remove('hidden');
        dropInner.classList.add('hidden');
    };
    reader.readAsDataURL(file);

    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    analyzeBtn.disabled = false;
}

function resetAll() {
    selectedFile = null;
    fileInput.value = '';
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    dropInner.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    analyzeBtn.disabled = true;
    hideError();
    showSection(emptyState);
}

var steps = ['step1', 'step2', 'step3', 'step4'];
var stepTimer = null;

function startLoading() {
    hideError();
    showSection(loadingState);
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
    analyzeBtn.disabled = true;

    var i = 0;
    steps.forEach(function(id) {
        document.getElementById(id).classList.remove('active', 'done');
    });
    document.getElementById(steps[0]).classList.add('active');

    stepTimer = setInterval(function() {
        if (i < steps.length - 1) {
            document.getElementById(steps[i]).classList.remove('active');
            document.getElementById(steps[i]).classList.add('done');
            i++;
            document.getElementById(steps[i]).classList.add('active');
        }
    }, 800);
}

function stopLoading() {
    clearInterval(stepTimer);
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    analyzeBtn.disabled = false;
}

analyzeBtn.addEventListener('click', async function() {
    if (!selectedFile) return;
    startLoading();

    var fd = new FormData();
    fd.append('image', selectedFile);

    try {
        var res = await fetch('/analyze', { method: 'POST', body: fd });
        var data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'server error ' + res.status);
        }

        showResults(data.result);

    } catch(err) {
        stopLoading();
        showError(err.message || 'Something went wrong, please try again.');
    }
});

function showResults(r) {
    stopLoading();
    showSection(resultsContent);

    document.getElementById('resultFlag').textContent = r.flag;
    document.getElementById('resultNation').textContent = r.nationality;

    setTimeout(function() {
        document.getElementById('confBarFill').style.width = r.confidence + '%';
    }, 80);

    document.getElementById('confPct').textContent = r.confidence + '% match';

    var stats = [];
    stats.push({ label: 'Emotion', value: r.emotion });

    if (r.show_age === true) {
        stats.push({ label: 'Age', value: fixAge(r.age) + ' yrs' });
    }

    if (r.show_dress === true) {
        stats.push({
            label: 'Dress Colour',
            value: r.dress_colour || 'Unknown',
            hex: r.dress_hex || null
        });
    }

    var statsRow = document.getElementById('statsRow');
    statsRow.innerHTML = '';

    stats.forEach(function(s) {
        var card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML =
            '<div class="stat-label">' + s.label + '</div>' +
            '<div class="stat-value">' +
                (s.hex ? '<span class="swatch" style="background:' + s.hex + '"></span>' : '') +
                s.value +
            '</div>';
        statsRow.appendChild(card);
    });

    makeChart('raceChart', r.race_chart, 'race-fill');
    makeChart('emotionChart', r.emotion_chart, 'emo-fill');

    drawRaceDonut(r.race_chart);
    drawEmotionRadar(r.emotion_chart);
    drawConfGauge(r.confidence);
    drawEmotionBar(r.emotion_chart);
}

function makeChart(id, items, cls) {
    var el = document.getElementById(id);
    if (!el || !items || items.length === 0) return;

    el.innerHTML = '';

    items.forEach(function(item) {
        var row = document.createElement('div');
        row.className = 'bar-row';
        row.innerHTML =
            '<div class="bar-name">' +
                '<span>' + item.name + '</span>' +
                '<span>' + item.confidence + '%</span>' +
            '</div>' +
            '<div class="bar-track">' +
                '<div class="bar-fill ' + cls + '" data-w="' + item.confidence + '"></div>' +
            '</div>';
        el.appendChild(row);
    });

    requestAnimationFrame(function() {
        el.querySelectorAll('.bar-fill').forEach(function(bar) {
            setTimeout(function() {
                bar.style.width = bar.dataset.w + '%';
            }, 60);
        });
    });
}

function drawRaceDonut(raceChart) {
    var labels = raceChart.map(function(d) { return d.name; });
    var values = raceChart.map(function(d) { return d.confidence; });

    var data = [{
        type: 'pie',
        hole: 0.55,
        labels: labels,
        values: values,
        textinfo: 'label+percent',
        textfont: { size: 10, color: '#e8eaf0' },
        marker: {
            colors: ['#f5a623', '#38e8c8', '#7c6ef7', '#ff4d6d', '#2dd4bf'],
            line: { color: '#161921', width: 2 }
        },
        hovertemplate: '<b>%{label}</b><br>%{value}%<extra></extra>'
    }];

    var layout = Object.assign({}, plotlyLayout, {
        height: 240,
        showlegend: false
    });

    Plotly.newPlot('plotRaceDonut', data, layout, plotlyConfig);
}

function drawEmotionRadar(emotionChart) {
    var allEmotions = ['Happy', 'Sad', 'Angry', 'Fear', 'Surprise', 'Disgust', 'Neutral'];
    var emotionMap = {};
    emotionChart.forEach(function(d) { emotionMap[d.name] = d.confidence; });
    var values = allEmotions.map(function(e) { return emotionMap[e] || 0; });
    values.push(values[0]);
    var categories = allEmotions.concat([allEmotions[0]]);

    var data = [{
        type: 'scatterpolar',
        r: values,
        theta: categories,
        fill: 'toself',
        fillcolor: 'rgba(245,166,35,0.15)',
        line: { color: '#f5a623', width: 2 },
        marker: { color: '#f5a623', size: 5 },
        hovertemplate: '<b>%{theta}</b><br>%{r}%<extra></extra>'
    }];

    var layout = Object.assign({}, plotlyLayout, {
        height: 240,
        polar: {
            bgcolor: 'rgba(0,0,0,0)',
            radialaxis: {
                visible: true,
                range: [0, 100],
                color: '#5a5f6e',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickfont: { size: 9, color: '#5a5f6e' }
            },
            angularaxis: {
                color: '#8b909e',
                gridcolor: 'rgba(255,255,255,0.06)',
                tickfont: { size: 10 }
            }
        }
    });

    Plotly.newPlot('plotEmotionRadar', data, layout, plotlyConfig);
}

function drawConfGauge(confidence) {
    var data = [{
        type: 'indicator',
        mode: 'gauge+number',
        value: confidence,
        number: { suffix: '%', font: { size: 28, color: '#f5a623' } },
        gauge: {
            axis: {
                range: [0, 100],
                tickcolor: '#5a5f6e',
                tickfont: { size: 9, color: '#5a5f6e' }
            },
            bar: { color: '#f5a623', thickness: 0.25 },
            bgcolor: 'rgba(255,255,255,0.04)',
            bordercolor: 'rgba(255,255,255,0.08)',
            steps: [
                { range: [0, 40],  color: 'rgba(255,77,109,0.15)' },
                { range: [40, 70], color: 'rgba(245,166,35,0.1)' },
                { range: [70, 100],color: 'rgba(56,232,200,0.1)' }
            ],
            threshold: {
                line: { color: '#38e8c8', width: 3 },
                thickness: 0.75,
                value: confidence
            }
        }
    }];

    var layout = Object.assign({}, plotlyLayout, {
        height: 240,
        margin: { t: 20, b: 20, l: 30, r: 30 }
    });

    Plotly.newPlot('plotConfGauge', data, layout, plotlyConfig);
}

function drawEmotionBar(emotionChart) {
    var names = emotionChart.map(function(d) { return d.name; });
    var values = emotionChart.map(function(d) { return d.confidence; });
    var colors = ['#f5a623', '#38e8c8', '#7c6ef7', '#ff4d6d', '#2dd4bf'];

    var data = [{
        type: 'bar',
        x: values,
        y: names,
        orientation: 'h',
        marker: {
            color: names.map(function(_, i) { return colors[i % colors.length]; }),
            line: { color: 'rgba(0,0,0,0)', width: 0 }
        },
        text: values.map(function(v) { return v + '%'; }),
        textposition: 'outside',
        textfont: { size: 10, color: '#8b909e' },
        hovertemplate: '<b>%{y}</b><br>%{x}%<extra></extra>'
    }];

    var layout = Object.assign({}, plotlyLayout, {
        height: 240,
        xaxis: {
            range: [0, 110],
            color: '#5a5f6e',
            gridcolor: 'rgba(255,255,255,0.05)',
            tickfont: { size: 9 },
            showgrid: true
        },
        yaxis: {
            color: '#8b909e',
            tickfont: { size: 10 },
            showgrid: false,
            automargin: true
        },
        margin: { t: 10, b: 30, l: 70, r: 40 }
    });

    Plotly.newPlot('plotEmotionBar', data, layout, plotlyConfig);
}