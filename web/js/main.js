// 全局状态
let currentMode = 'moment';
const uploadedFiles = [];
let analyzing = false;
let currentTaskId = null;
let pollTimer = null;

// 页面元素
const homePage = document.getElementById('homePage');
const uploadPage = document.getElementById('uploadPage');
const drawPage = document.getElementById('drawPage');
const uploadTitle = document.getElementById('uploadTitle');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const analyzeUploadBtn = document.getElementById('analyzeUploadBtn');
const msgContainer = document.getElementById('msgContainer');
const resultContainer = document.getElementById('resultContainer');

// 页面导航
window.goBack = function() {
    uploadPage.classList.remove('active');
    drawPage.classList.remove('active');
    homePage.classList.add('active');
    stopPolling();
};

// 模式选择
document.querySelectorAll('.feature-item').forEach(item => {
    item.addEventListener('click', () => {
        const mode = item.dataset.mode;
        currentMode = mode;
        homePage.classList.remove('active');
        if (mode === 'htp') {
            drawPage.classList.add('active');
            initCanvas();
        } else {
            uploadPage.classList.add('active');
            uploadTitle.textContent = mode === 'moment' ? '朋友圈分析' : '聊天分析';
            uploadedFiles.length = 0;
            renderFileList();
            analyzeUploadBtn.disabled = true;
        }
    });
});

// 上传逻辑
const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.background = '#F0F7EC'; });
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
        if (uploadedFiles.length >= 3) { alert('最多3张'); break; }
        uploadedFiles.push(f);
    }
    renderFileList();
    analyzeUploadBtn.disabled = uploadedFiles.length === 0;
}

function renderFileList() {
    filePreview.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item"><span><i class="fas fa-image"></i> ${f.name}</span>
        <button onclick="removeFile(${i})"><i class="fas fa-times"></i></button></div>
    `).join('');
}
window.removeFile = (i) => { uploadedFiles.splice(i, 1); renderFileList(); analyzeUploadBtn.disabled = uploadedFiles.length === 0; };
document.getElementById('clearUploadBtn').addEventListener('click', () => { uploadedFiles.length = 0; renderFileList(); analyzeUploadBtn.disabled = true; });

// 图片压缩
async function compressImage(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 800) { h = h * 800 / w; w = 800; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(b => resolve(new File([b], file.name, {type:'image/jpeg'})), 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadFile(file) {
    const compressed = await compressImage(file);
    const form = new FormData();
    form.append('file', compressed);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data.url;
}

// 提交分析
async function submitAnalysis(type, imageUrls, selfDesc = '') {
    if (analyzing) return;
    analyzing = true;
    showMessage('progress', 'AI分析中...');
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, images: imageUrls, selfDesc })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        currentTaskId = data.data.taskId;
        startPolling();
    } catch (e) {
        showMessage('error', e.message);
        analyzing = false;
    }
}

analyzeUploadBtn.addEventListener('click', async () => {
    const urls = [];
    for (const f of uploadedFiles) {
        try { urls.push(await uploadFile(f)); } catch (e) { showMessage('error', e.message); return; }
    }
    submitAnalysis(currentMode, urls);
});

// 轮询
function startPolling() {
    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`/api/task?id=${currentTaskId}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            const task = data.data;
            if (task.status === 'completed') {
                stopPolling();
                showMessage('success', '分析完成');
                resultContainer.style.display = 'block';
                resultContainer.innerHTML = `<pre>${task.result}</pre>`;
                analyzing = false;
            } else if (task.status === 'failed') {
                stopPolling();
                showMessage('error', task.error);
                analyzing = false;
            }
        } catch (e) { console.error(e); }
    }, 3000);
}
function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }

// 房树人画板
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false, eraser = false, lastX, lastY;
let history = [];
const MAX_HISTORY = 30;

function initCanvas() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
}
function saveState() { history.push(ctx.getImageData(0,0,canvas.width,canvas.height)); if(history.length>MAX_HISTORY) history.shift(); }
function undo() { if(history.length>1) { history.pop(); ctx.putImageData(history[history.length-1],0,0); } }

function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
}

function startDraw(e) {
    e.preventDefault();
    const { x, y } = getCoords(e);
    drawing = true; lastX = x; lastY = y;
    saveState();
    if (!eraser) {
        ctx.beginPath();
        ctx.arc(x, y, ctx.lineWidth/2, 0, 2*Math.PI);
        ctx.fillStyle = document.querySelector('.color-btn.active').dataset.color;
        ctx.fill();
    }
}
function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = eraser ? '#FFFFFF' : document.querySelector('.color-btn.active').dataset.color;
    ctx.lineWidth = parseInt(document.querySelector('.size-btn.active').dataset.size);
    ctx.lineCap = 'round';
    ctx.stroke();
    lastX = x; lastY = y;
}
function endDraw(e) { e.preventDefault(); drawing = false; }

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

document.getElementById('analyzeDrawingBtn').addEventListener('click', async () => {
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const form = new FormData();
    form.append('file', blob, 'drawing.png');
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.success) return showMessage('error', data.error);
    const selfDesc = document.getElementById('selfDescInput').value;
    submitAnalysis('htp', [data.data.url], selfDesc);
});

// 辅助
function showMessage(type, text) {
    msgContainer.innerHTML = `<div class="msg msg-${type}"><i class="fas fa-${type==='progress'?'spinner fa-pulse':(type==='error'?'exclamation-circle':'check-circle')}"></i>${text}</div>`;
    if (type !== 'progress') setTimeout(() => msgContainer.innerHTML = '', 4000);
}

// 公告
fetch('/api/announcement').then(r=>r.json()).then(d=>{
    if (d.success && d.data.content) {
        document.getElementById('announcementText').innerHTML = d.data.content;
        document.getElementById('announcementBar').style.display = 'flex';
    }
});
document.getElementById('closeAnnouncement').addEventListener('click', ()=>{
    document.getElementById('announcementBar').style.display = 'none';
});

// 字数统计
document.getElementById('selfDescInput').addEventListener('input', e => {
    document.getElementById('charCount').textContent = e.target.value.length;
});
