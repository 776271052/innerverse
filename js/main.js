/**
 * 内心宇宙 · 专家优化版
 * 功能：模式切换、图片上传压缩、画板绘制、AI分析、分享、导出
 */

// ----- 全局状态 -----
let currentMode = 'moment';
const uploadedFiles = [];
let analyzing = false;

// ----- DOM 元素 -----
const homePage = document.getElementById('homePage');
const uploadPage = document.getElementById('uploadPage');
const drawPage = document.getElementById('drawPage');
const uploadTitle = document.getElementById('uploadTitle');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const analyzeUploadBtn = document.getElementById('analyzeUploadBtn');
const msgContainer = document.getElementById('msgContainer');
const resultContainer = document.getElementById('resultContainer');

// ----- 页面导航 -----
window.goBack = () => {
    uploadPage.classList.remove('active');
    drawPage.classList.remove('active');
    homePage.classList.add('active');
};

// ----- 模式选择 -----
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
            uploadedFiles.length = 0;
            renderFileList();
            analyzeUploadBtn.disabled = true;
        }
    });
});

// ----- 上传逻辑 -----
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(files);
});

fileInput.addEventListener('change', e => {
    addFiles(Array.from(e.target.files));
    fileInput.value = '';
});

function addFiles(files) {
    for (const f of files) {
        if (uploadedFiles.length >= 3) {
            alert('最多上传3张图片');
            break;
        }
        if (f.size > 10 * 1024 * 1024) {
            alert('图片大小不能超过10MB');
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

window.removeFile = index => {
    uploadedFiles.splice(index, 1);
    renderFileList();
    analyzeUploadBtn.disabled = uploadedFiles.length === 0;
};

document.getElementById('clearUploadBtn').addEventListener('click', () => {
    uploadedFiles.length = 0;
    renderFileList();
    analyzeUploadBtn.disabled = true;
});

// ----- 图片压缩 -----
async function compressImage(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 1200) {
                    h = (h * 1200) / w;
                    w = 1200;
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ----- AI 分析提交 -----
async function submitAnalysis(type, imageBase64Array, selfDesc = '') {
    if (analyzing) return;
    analyzing = true;
    showMessage('progress', 'AI 正在解读中，请稍候...');

    // 模拟进度更新（优化等待体验）
    const progressMessages = ['🔍 正在分析图像...', '🧠 模型推理中...', '📝 生成报告中...'];
    let idx = 0;
    const progressInterval = setInterval(() => {
        if (msgContainer.querySelector('.msg-progress span')) {
            msgContainer.querySelector('.msg-progress span').textContent = progressMessages[idx++ % progressMessages.length];
        }
    }, 2000);

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, images: imageBase64Array, selfDesc })
        });
        clearInterval(progressInterval);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        showMessage('success', '分析完成！');
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `<pre>${data.result}</pre>`;
    } catch (e) {
        clearInterval(progressInterval);
        showMessage('error', `分析失败: ${e.message}`);
    } finally {
        analyzing = false;
    }
}

analyzeUploadBtn.addEventListener('click', async () => {
    const base64Array = [];
    for (const f of uploadedFiles) {
        try {
            const compressed = await compressImage(f);
            const b64 = await fileToBase64(compressed);
            base64Array.push(b64);
        } catch (e) {
            showMessage('error', `图片处理失败: ${e.message}`);
            return;
        }
    }
    submitAnalysis(currentMode, base64Array);
});

// ----- 房树人画板（防抖优化）-----
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let drawing = false;
let eraser = false;
let lastX, lastY;
let history = [];
const MAX_HISTORY = 30;
let drawScheduled = false;

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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    x = Math.min(canvas.width, Math.max(0, x));
    y = Math.min(canvas.height, Math.max(0, y));
    return { x, y };
}

function startDraw(e) {
    e.preventDefault();
    const { x, y } = getCoords(e);
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
    if (!drawing || drawScheduled) return;
    drawScheduled = true;
    requestAnimationFrame(() => {
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = eraser ? '#FFFFFF' : document.querySelector('.color-btn.active').dataset.color;
        ctx.lineWidth = parseInt(document.querySelector('.size-btn.active').dataset.size);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastX = x;
        lastY = y;
        drawScheduled = false;
    });
}

function endDraw(e) {
    e.preventDefault();
    drawing = false;
}

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);

// 工具栏交互
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        eraser = false;
        document.getElementById('eraserBtn').classList.remove('active');
    });
});

document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

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
    const selfDesc = document.getElementById('selfDescInput').value;
    submitAnalysis('htp', [dataURL], selfDesc);
});

document.getElementById('selfDescInput').addEventListener('input', e => {
    document.getElementById('charCount').textContent = e.target.value.length;
});

// 自定义颜色
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

// 消息提示
function showMessage(type, text) {
    const icon = type === 'progress' ? 'spinner fa-pulse' : (type === 'error' ? 'exclamation-circle' : 'check-circle');
    msgContainer.innerHTML = `
        <div class="msg msg-${type}">
            <i class="fas fa-${icon}"></i>
            <span>${text}</span>
        </div>
    `;
    if (type !== 'progress') {
        setTimeout(() => msgContainer.innerHTML = '', 4000);
    }
}
