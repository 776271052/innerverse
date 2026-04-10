let currentMode = 'moment';
let chatScope = 'private';
const uploadedFiles = [];
let analyzing = false;
let currentResultData = null;

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
const exportBtnWrapper = document.getElementById('exportBtnWrapper');
const exportImageBtn = document.getElementById('exportImageBtn');

const progressSteps = ['📤 正在上传图片...', '🔍 AI 正在分析中...', '📝 即将完成...'];

// 维度配色方案
const colorSchemes = {
    moment: {
        E: '#FF9F43', I: '#5A9CFF',
        S: '#A0785A', N: '#9B6B9E',
        T: '#26C6DA', F: '#FF8A80',
        J: '#2E7D32', P: '#FFD54F'
    },
    chat_private: {
        directness: '#FF6B6B', rationality: '#4DABF7',
        initiative: '#F59F00', closeness: '#FAA2C1'
    },
    chat_group: {
        activity: '#FF9F43', leadership: '#5A9CFF',
        positivity: '#51CF66', role: '#B0B7FF'
    },
    htp: {
        security: '#2F9E44', family: '#FD7E14',
        self: '#20C997', growth: '#8CE99A',
        openness: '#3BC9DB'
    }
};

window.goBack = () => {
    uploadPage.classList.remove('active');
    drawPage.classList.remove('active');
    homePage.classList.add('active');
    uploadedFiles.length = 0;
    renderFileList();
    resultContainer.style.display = 'none';
    resultContainer.innerHTML = '';
    msgContainer.innerHTML = '';
    exportBtnWrapper.style.display = 'none';
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
            exportBtnWrapper.style.display = 'none';
        }
    });
});

document.querySelectorAll('.scope-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chatScope = btn.dataset.scope;
        uploadedFiles.length = 0;
        renderFileList();
        analyzeUploadBtn.disabled = true;
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
        msgContainer.innerHTML = '';
        exportBtnWrapper.style.display = 'none';
    });
});

const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.background = '#F0FDF4'; });
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
        if (f.size > 10 * 1024 * 1024) { alert('图片不超过10MB'); continue; }
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
window.removeFile = i => { uploadedFiles.splice(i, 1); renderFileList(); analyzeUploadBtn.disabled = uploadedFiles.length === 0; };
document.getElementById('clearUploadBtn').addEventListener('click', () => { uploadedFiles.length = 0; renderFileList(); analyzeUploadBtn.disabled = true; });

async function compressImage(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 1200) { h = h * 1200 / w; w = 1200; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(b => r(new File([b], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.8);
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

function drawCircularProgress(canvas, percent, color) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const centerX = w / 2, centerY = h / 2, radius = 40, lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#E9ECEF';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * percent / 100));
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function renderResult(parsedData, rawText) {
    if (!parsedData || !parsedData.dimensions) {
        resultContainer.innerHTML = `<pre>${rawText}</pre>`;
        resultContainer.style.display = 'block';
        exportBtnWrapper.style.display = 'block';
        return;
    }

    const { dimensions, type, mbtiType, role } = parsedData;
    let colorMap = colorSchemes[type] || {};
    if (type === 'chat') colorMap = chatScope === 'group' ? colorSchemes.chat_group : colorSchemes.chat_private;

    let html = '<div class="dimensions-grid">';
    for (const [key, value] of Object.entries(dimensions)) {
        const percent = typeof value === 'number' ? value : parseInt(value) || 50;
        const color = colorMap[key] || '#2EBD85';
        const canvasId = `canvas-${key}-${Date.now()}-${Math.random()}`;
        html += `<div class="dimension-item">`;
        html += `<canvas class="dimension-canvas" id="${canvasId}" width="100" height="100"></canvas>`;
        html += `<div class="dimension-label">${key}</div>`;
        html += `<div class="dimension-value">${percent}%</div>`;
        html += `</div>`;
    }
    html += '</div>';
    if (mbtiType) html += `<div style="text-align:center;margin-bottom:16px;"><span style="background:var(--primary-soft);padding:6px 16px;border-radius:40px;font-weight:600;">MBTI类型：${mbtiType}</span></div>`;
    if (role) html += `<div style="text-align:center;margin-bottom:16px;"><span style="background:var(--primary-soft);padding:6px 16px;border-radius:40px;font-weight:600;">群体角色：${role}</span></div>`;
    html += `<div class="analysis-text">${rawText.replace(/```json[\s\S]*?```/, '').trim()}</div>`;
    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';

    for (const [key, value] of Object.entries(dimensions)) {
        const percent = typeof value === 'number' ? value : parseInt(value) || 50;
        const canvas = document.getElementById(`canvas-${key}-${Date.now()}`);
        if (canvas) drawCircularProgress(canvas, percent, colorMap[key] || '#2EBD85');
    }

    exportBtnWrapper.style.display = 'block';
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
        const payload = { type, images: imageBase64Array, selfDesc };
        if (type === 'chat') payload.scope = chatScope;

        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        clearInterval(progressInterval);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        msgContainer.innerHTML = '';
        const rawText = data.result;
        let parsedData = null;
        try {
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
            if (jsonMatch) parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } catch (e) {}

        currentResultData = { parsedData, rawText };
        renderResult(parsedData, rawText);
    } catch (e) {
        clearInterval(progressInterval);
        msgContainer.innerHTML = `<div class="msg msg-error"><i class="fas fa-exclamation-circle"></i><span>${e.message}</span></div>`;
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
            msgContainer.innerHTML = `<div class="msg msg-error"><i class="fas fa-exclamation-circle"></i><span>${e.message}</span></div>`;
            return;
        }
    }
    submitAnalysis(currentMode, base64Array);
});

async function exportWithQRCode() {
    if (!resultContainer) return;
    const wrapper = resultContainer;
    const originalBorderRadius = wrapper.style.borderRadius;
    wrapper.style.borderRadius = '28px';
    try {
        const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#FFFFFF', allowTaint: false, useCNAME: true });
        const qr = qrcode(0, 'M');
        qr.addData('https://innerverse.776271052.xyz/');
        qr.make();
        const qrSize = 120;
        const qrDataURL = qr.createDataURL(10, 0);
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        finalCanvas.width = canvas.width;
        finalCanvas.height = canvas.height;
        ctx.drawImage(canvas, 0, 0);
        const qrImg = new Image();
        await new Promise(resolve => { qrImg.onload = resolve; qrImg.src = qrDataURL; });
        const padding = 24;
        const qrX = finalCanvas.width - qrSize - padding;
        const qrY = finalCanvas.height - qrSize - padding;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#2C3E50';
        ctx.textAlign = 'right';
        ctx.fillText('扫码访问网站', qrX + qrSize/2, qrY - 12);
        const link = document.createElement('a');
        link.download = `innerverse-${Date.now()}.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        alert('导出失败: ' + e.message);
    } finally {
        wrapper.style.borderRadius = originalBorderRadius;
    }
}
exportImageBtn.addEventListener('click', exportWithQRCode);

// 房树人画板（无变化）
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false, eraser = false, lastX, lastY, history = [], MAX_HISTORY = 30;
function initCanvas() { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); history = []; saveState(); }
function saveState() { history.push(ctx.getImageData(0, 0, canvas.width, canvas.height)); if (history.length > MAX_HISTORY) history.shift(); }
function undo() { if (history.length > 1) { history.pop(); ctx.putImageData(history[history.length - 1], 0, 0); } }
function getCoords(e) { const rect = canvas.getBoundingClientRect(); const sx = canvas.width / rect.width, sy = canvas.height / rect.height; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: Math.min(canvas.width, Math.max(0, (cx - rect.left) * sx)), y: Math.min(canvas.height, Math.max(0, (cy - rect.top) * sy)) }; }
function startDraw(e) { e.preventDefault(); const { x, y } = getCoords(e); drawing = true; lastX = x; lastY = y; saveState(); if (!eraser) { ctx.beginPath(); ctx.arc(x, y, ctx.lineWidth / 2, 0, 2 * Math.PI); ctx.fillStyle = document.querySelector('.color-btn.active').dataset.color; ctx.fill(); } }
function draw(e) { e.preventDefault(); if (!drawing) return; const { x, y } = getCoords(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.strokeStyle = eraser ? '#FFFFFF' : document.querySelector('.color-btn.active').dataset.color; ctx.lineWidth = parseInt(document.querySelector('.size-btn.active').dataset.size); ctx.lineCap = 'round'; ctx.stroke(); lastX = x; lastY = y; }
function endDraw(e) { e.preventDefault(); drawing = false; }
canvas.addEventListener('pointerdown', startDraw); canvas.addEventListener('pointermove', draw); canvas.addEventListener('pointerup', endDraw); canvas.addEventListener('pointercancel', endDraw);
document.querySelectorAll('.color-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active')); this.classList.add('active'); eraser = false; document.getElementById('eraserBtn').classList.remove('active'); }));
document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.size-btn').forEach(s => s.classList.remove('active')); this.classList.add('active'); }));
document.getElementById('eraserBtn').addEventListener('click', function() { eraser = !eraser; this.classList.toggle('active', eraser); });
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('clearCanvasBtn').addEventListener('click', () => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); history = []; saveState(); });
document.getElementById('analyzeDrawingBtn').addEventListener('click', () => { const dataURL = canvas.toDataURL('image/jpeg', 0.7); submitAnalysis('htp', [dataURL], document.getElementById('selfDescInput').value); });
document.getElementById('selfDescInput').addEventListener('input', e => { document.getElementById('charCount').textContent = e.target.value.length; });
const customColorBtn = document.getElementById('customColorBtn'); const colorPicker = document.getElementById('colorPicker');
customColorBtn.addEventListener('click', () => colorPicker.click());
colorPicker.addEventListener('input', e => { const color = e.target.value; customColorBtn.querySelector('.custom-dot').style.background = color; customColorBtn.dataset.color = color; document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active')); customColorBtn.classList.add('active'); eraser = false; document.getElementById('eraserBtn').classList.remove('active'); });
