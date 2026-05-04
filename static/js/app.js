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