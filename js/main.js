let currentMode = 'moment';
let chatScope = 'private';
const uploadedFiles = [];
let analyzing = false;

const homePage = document.getElementById('homePage');
const uploadPage = document.getElementById('uploadPage');
const drawPage = document.getElementById('drawPage');
const uploadTitle = document.getElementById('uploadTitle');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const analyzeUploadBtn = document.getElementById('analyzeUploadBtn');
const msgContainer = document.getElementById('msgContainer');
const resultContainer = document.getElementById('resultContainer');
const chatScopeWrapper = document.getElementById('chatScopeWrapper');

const progressSteps = [
    '📤 正在上传图片...',
    '🔍 AI 正在分析中...',
    '📝 即将完成...'
];

window.goBack = () => {
    uploadPage.classList.remove('active');
    drawPage.classList.remove('active');
    homePage.classList.add('active');
    uploadedFiles.length = 0;
    renderFileList();
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';
    msgContainer.innerHTML = '';
};

document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        currentMode = mode;
        homePage.classList.remove('active');
        if (mode === 'htp') {
            drawPage.classList.add('active');
            initCanvas();
        } else {
            uploadPage.classList.add('active');
            uploadTitle.textContent = mode === 'moment' ? '朋友圈读心' : '聊天风格分析';
            chatScopeWrapper.style.display = mode === 'chat' ? 'block' : 'none';
            uploadedFiles.length = 0;
            renderFileList();
            analyzeUploadBtn.disabled = true;
            resultContainer.style.display = 'none';
            resultContainer.innerHTML = '';
            msgContainer.innerHTML = '';
        }
    });
});

document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chatScope = btn.dataset.scope;
    });
});

const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.style.background = '#F0FDF4';
});
uploadArea.addEventListener('dragleave', () => uploadArea.style.background = '');
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.background = '';
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});
fileInput.addEventListener('change', e => {
    addFiles(Array.from(e.target.files));
    fileInput.value = '';
});

function addFiles(files) {
    for (const f of files) {
        if (uploadedFiles.length >= 3) {
            alert('最多3张');
            break;
        }
        if (f.size > 10 * 1024 * 1024) {
            alert('图片不超过10MB');
            continue;
        }
        uploadedFiles.push(f);
    }
    renderFileList();
    analyzeUploadBtn.disabled = uploadedFiles.length === 0;
}

function renderFileList() {
    filePreview.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item">
            <span><i class="fas fa-image"></i> ${f.name}</span>
            <button class="remove-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}
window.removeFile = i => {
    uploadedFiles.splice(i, 1);
    renderFileList();
    analyzeUploadBtn.disabled = uploadedFiles.length === 0;
};

document.getElementById('clearUploadBtn').addEventListener('click', () => {
    uploadedFiles.length = 0;
    renderFileList();
    analyzeUploadBtn.disabled = true;
});

async function compressImage(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width,
                    h = img.height;
                if (w > 1200) {
                    h = h * 1200 / w;
                    w = 1200;
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(b => r(new File([b], file.name, {
                    type: 'image/jpeg'
                })), 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function fileToBase64(file) {
    return new Promise((r, e) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result);
        reader.onerror = e;
        reader.readAsDataURL(file);
    });
}

function updateProgressMessage(stepIndex) {
    if (!msgContainer) return;
    msgContainer.innerHTML = `
        <div class="msg msg-progress">
            <i class="fas fa-spinner fa-pulse"></i>
            <span>${progressSteps[stepIndex] || '处理中...'}</span>
        </div>
    `;
}

async function submitAnalysis(type, imageBase64Array, selfDesc = '') {
    if (analyzing) return;
    analyzing = true;

    let step = 0;
    updateProgressMessage(step);
    const progressInterval = setInterval(() => {
        step = (step + 1) % progressSteps.length;
        updateProgressMessage(step);
    }, 2000);

    try {
        const payload = {
            type,
            images: imageBase64Array,
            selfDesc
        };
        if (type === 'chat') {
            payload.scope = chatScope;
        }

        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        clearInterval(progressInterval);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        msgContainer.innerHTML = '';
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `<pre>${data.result}</pre>`;
    } catch (e) {
        clearInterval(progressInterval);
        msgContainer.innerHTML = `
            <div class="msg msg-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${e.message}</span>
            </div>
        `;
    } finally {
        analyzing = false;
    }
}

analyzeUploadBtn.addEventListener('click', async () => {
    const base64Array = [];
    for (const f of uploadedFiles) {
        try {
            const c = await compressImage(f);
            const b64 = await fileToBase64(c);
            base64Array.push(b64);
        } catch (e) {
            msgContainer.innerHTML = `
                <div class="msg msg-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${e.message}</span>
                </div>
            `;
            return;
        }
    }
    submitAnalysis(currentMode, base64Array);
});

const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false,
    eraser = false,
    lastX, lastY,
    history = [],
    MAX_HISTORY = 30;

function initCanvas() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    history = [];
    saveState();
}

function saveState() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > MAX_HISTORY) history.shift();
}

function undo() {
    if (history.length > 1) {
        history.pop();
        ctx.putImageData(history[history.length - 1], 0, 0);
    }
}

function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width,
        sy = canvas.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: Math.min(canvas.width, Math.max(0, (cx - rect.left) * sx)),
        y: Math.min(canvas.height, Math.max(0, (cy - rect.top) * sy))
    };
}

function startDraw(e) {
    e.preventDefault();
    const {
        x,
        y
    } = getCoords(e);
    drawing = true;
    lastX = x;
    lastY = y;
    saveState();
    if (!eraser) {
        ctx.beginPath();
        ctx.arc(x, y, ctx.lineWidth / 2, 0, 2 * Math.PI);
        ctx.fillStyle = document.querySelector('.color-btn.active').dataset.color;
        ctx.fill();
    }
}

function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const {
        x,
        y
    } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = eraser ? '#FFFFFF' : document.querySelector('.color-btn.active').dataset.color;
    ctx.lineWidth = parseInt(document.querySelector('.size-btn.active').dataset.size);
    ctx.lineCap = 'round';
    ctx.stroke();
    lastX = x;
    lastY = y;
}

function endDraw(e) {
    e.preventDefault();
    drawing = false;
}

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);

document.querySelectorAll('.color-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    eraser = false;
    document.getElementById('eraserBtn').classList.remove('active');
}));
document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.size-btn').forEach(s => s.classList.remove('active'));
    this.classList.add('active');
}));
document.getElementById('eraserBtn').addEventListener('click', function() {
    eraser = !eraser;
    this.classList.toggle('active', eraser);
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('clearCanvasBtn').addEventListener('click', () => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    history = [];
    saveState();
});

document.getElementById('analyzeDrawingBtn').addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    submitAnalysis('htp', [dataURL], document.getElementById('selfDescInput').value);
});

document.getElementById('selfDescInput').addEventListener('input', e => {
    document.getElementById('charCount').textContent = e.target.value.length;
});

const customColorBtn = document.getElementById('customColorBtn');
const colorPicker = document.getElementById('colorPicker');
customColorBtn.addEventListener('click', () => colorPicker.click());
colorPicker.addEventListener('input', e => {
    const color = e.target.value;
    customColorBtn.querySelector('.custom-dot').style.background = color;
    customColorBtn.dataset.color = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    customColorBtn.classList.add('active');
    eraser = false;
    document.getElementById('eraserBtn').classList.remove('active');
});
