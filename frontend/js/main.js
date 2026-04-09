// ========== 全局配置 ==========
const CONFIG = {
    MAX_FILES: 3,
    MAX_FILE_SIZE_MB: 5,
    COOLDOWN: 10000,
    POLL_INTERVAL: 3000,
    MAX_POLL_DELAY: 10000,
    COMPRESS_QUALITY: 0.6,
    MAX_IMAGE_WIDTH: 800
};

// ========== DOM 元素 ==========
const modeOptions = document.querySelectorAll('.mode-option');
const momentDiv = document.getElementById('momentMode');
const chatDiv = document.getElementById('chatMode');
const htpDiv = document.getElementById('htpMode');
const momentUpload = document.getElementById('momentUploadArea');
const momentFile = document.getElementById('momentFileInput');
const momentPreview = document.getElementById('momentPreview');
const analyzeMomentBtn = document.getElementById('analyzeMomentBtn');
const clearMomentBtn = document.getElementById('clearMomentBtn');
const chatUpload = document.getElementById('chatUploadArea');
const chatFile = document.getElementById('chatFileInput');
const chatPreview = document.getElementById('chatPreview');
const analyzeChatBtn = document.getElementById('analyzeChatBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const analyzeHtpBtn = document.getElementById('analyzeHtpBtn');
const clearHtpBtn = document.getElementById('clearHtpBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const undoCanvasBtn = document.getElementById('undoCanvasBtn');
const penColor = document.getElementById('penColor');
const penWidth = document.getElementById('penWidth');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportImageBtn = document.getElementById('exportImageBtn');
const msgContainer = document.getElementById('msgContainer');
const resultContainer = document.getElementById('resultContainer');
const announcementBar = document.getElementById('announcementBar');
const announcementText = document.getElementById('announcementText');
const closeAnnouncement = document.getElementById('closeAnnouncement');

// ========== 全局状态 ==========
let currentMode = 'moment';
let analyzing = false;
let lastAnalyzeTime = 0;
let progressInterval = null;
let progressMsgDiv = null;
let pollInterval = null;
let pollDelay = CONFIG.POLL_INTERVAL;
let currentTaskId = null;

const progressMessages = [
    "📤 正在提交任务...",
    "🤖 AI 正在后台分析，请稍等...",
    "📊 任务处理中，马上就好...",
    "💡 即将生成报告..."
];
let progressIndex = 0;

// R2 公共访问域名（替换为你的实际域名）
const R2_PUBLIC_URL = 'https://images.innerverse.xyz';

// ========== 图片压缩工具 ==========
async function compressImage(file, maxWidth = CONFIG.MAX_IMAGE_WIDTH, quality = CONFIG.COMPRESS_QUALITY) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ========== 上传图片到 R2 ==========
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data.key;
}

// ========== 通用文件列表管理器 ==========
class FileListManager {
    constructor(options) {
        this.container = options.container;
        this.fileInput = options.fileInput;
        this.analyzeBtn = options.analyzeBtn;
        this.maxFiles = options.maxFiles || 3;
        this.files = [];
        this.onUpdate = options.onUpdate || (() => {});
    }

    async addFiles(newFiles) {
        for (const file of newFiles) {
            if (this.files.length >= this.maxFiles) {
                alert(`最多上传 ${this.maxFiles} 张图片`);
                break;
            }
            const compressed = await compressImage(file);
            if (compressed.size > CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`图片 "${file.name}" 压缩后仍超过 ${CONFIG.MAX_FILE_SIZE_MB}MB`);
                continue;
            }
            this.files.push(compressed);
        }
        this.render();
        this.onUpdate(this.files);
    }

    clear() {
        this.files = [];
        this.render();
        this.onUpdate([]);
    }

    removeFile(index) {
        this.files.splice(index, 1);
        this.render();
        this.onUpdate(this.files);
    }

    render() {
        this.container.innerHTML = this.files.map((file, idx) => `
            <div class="file-item">
                <div class="file-preview">
                    <i class="fas fa-image"></i>
                    <span class="file-name">${file.name}</span>
                </div>
                <button class="btn-sm btn-outline" data-remove="${idx}"><i class="fas fa-times"></i> 移除</button>
            </div>
        `).join('');
        this.container.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.remove);
                this.removeFile(idx);
            });
        });
        this.analyzeBtn.disabled = this.files.length === 0;
    }
}

// 初始化各模式管理器
const momentManager = new FileListManager({
    container: momentPreview,
    fileInput: momentFile,
    analyzeBtn: analyzeMomentBtn,
    maxFiles: CONFIG.MAX_FILES
});

const chatManager = new FileListManager({
    container: chatPreview,
    fileInput: chatFile,
    analyzeBtn: analyzeChatBtn,
    maxFiles: CONFIG.MAX_FILES
});

// ========== UI 辅助函数 ==========
function showMessage(type, text, details = '', autoClose = true) {
    if (type === 'error' && details) console.error('Error details:', details);
    const existing = document.querySelectorAll(`.msg-${type}`);
    existing.forEach(msg => msg.remove());
    const div = document.createElement('div');
    div.className = `msg msg-${type}`;
    let icon = type === 'progress' ? '<i class="fas fa-spinner fa-pulse"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : '<i class="fas fa-check-circle"></i>');
    let full = text;
    if (type !== 'error' && details) full += `<br><span style="font-size:0.75rem;">${details}</span>`;
    div.innerHTML = `<div class="msg-content">${icon}<span class="msg-text">${full}</span></div><div class="msg-close"><i class="fas fa-times"></i></div>`;
    div.querySelector('.msg-close').onclick = () => div.remove();
    msgContainer.appendChild(div);
    if (autoClose && type !== 'progress') setTimeout(() => div.remove(), 5000);
    return div;
}

function stopProgressUpdates() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    if (progressMsgDiv) {
        progressMsgDiv.remove();
        progressMsgDiv = null;
    }
}

function startProgressUpdates(initialMsg) {
    stopProgressUpdates();
    progressMsgDiv = showMessage('progress', initialMsg, '', false);
    const msgTextSpan = progressMsgDiv.querySelector('.msg-text');
    if (msgTextSpan) {
        progressInterval = setInterval(() => {
            if (progressMsgDiv && progressMsgDiv.parentNode) {
                const newMsg = progressMessages[progressIndex % progressMessages.length];
                msgTextSpan.innerHTML = newMsg;
                progressIndex++;
            } else {
                stopProgressUpdates();
            }
        }, 3000);
    }
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar-container';
    const fill = document.createElement('div');
    fill.className = 'progress-bar-fill';
    progressBar.appendChild(fill);
    progressMsgDiv.querySelector('.msg-content').appendChild(progressBar);
    let width = 10;
    const interval = setInterval(() => {
        if (width < 90) {
            width += 5;
            fill.style.width = width + '%';
        }
    }, 800);
    const originalRemove = progressMsgDiv.remove;
    progressMsgDiv.remove = () => {
        clearInterval(interval);
        originalRemove.call(progressMsgDiv);
    };
}

function stopPolling() {
    if (pollInterval) {
        clearTimeout(pollInterval);
        pollInterval = null;
    }
    pollDelay = CONFIG.POLL_INTERVAL;
}

async function pollTaskStatus(taskId) {
    try {
        const res = await fetch(`/api/task-status?taskId=${taskId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        const task = data.data;
        if (task.status === 'completed') {
            stopProgressUpdates();
            showMessage('success', '分析完成！');
            displayResult(task.result);
            analyzing = false;
            stopPolling();
        } else if (task.status === 'failed') {
            stopProgressUpdates();
            showMessage('error', '分析失败: ' + (task.error || '未知错误'));
            analyzing = false;
            stopPolling();
        } else {
            pollDelay = Math.min(pollDelay * 1.5, CONFIG.MAX_POLL_DELAY);
            pollInterval = setTimeout(() => pollTaskStatus(taskId), pollDelay);
        }
    } catch (err) {
        stopProgressUpdates();
        showMessage('error', '查询状态失败: ' + err.message);
        analyzing = false;
        stopPolling();
    }
}

function displayResult(result) {
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = `<div style="white-space: pre-wrap;">${result}</div>`;
}

async function submitTask(type, imageKeys) {
    if (analyzing) {
        showMessage('error', '已有任务正在处理中，请稍后');
        return;
    }
    const now = Date.now();
    if (now - lastAnalyzeTime < CONFIG.COOLDOWN) {
        const wait = Math.ceil((CONFIG.COOLDOWN - (now - lastAnalyzeTime)) / 1000);
        showMessage('error', `请等待 ${wait} 秒后再提交新任务`);
        return;
    }
    lastAnalyzeTime = now;
    analyzing = true;

    try {
        startProgressUpdates('正在提交分析任务...');
        const res = await fetch('/api/submit-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, imageKeys })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        currentTaskId = data.data.taskId;
        pollDelay = CONFIG.POLL_INTERVAL;
        pollInterval = setTimeout(() => pollTaskStatus(currentTaskId), pollDelay);
    } catch (err) {
        stopProgressUpdates();
        showMessage('error', '提交任务失败: ' + err.message);
        analyzing = false;
    }
}

// ========== 模式切换 ==========
modeOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        modeOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const mode = opt.dataset.mode;
        currentMode = mode;
        momentDiv.style.display = mode === 'moment' ? 'block' : 'none';
        chatDiv.style.display = mode === 'chat' ? 'block' : 'none';
        htpDiv.style.display = mode === 'htp' ? 'block' : 'none';
    });
});

// ========== 上传区域绑定 ==========
momentUpload.addEventListener('click', () => momentFile.click());
momentFile.addEventListener('change', (e) => {
    momentManager.addFiles(Array.from(e.target.files));
    e.target.value = '';
});
clearMomentBtn.addEventListener('click', () => momentManager.clear());

chatUpload.addEventListener('click', () => chatFile.click());
chatFile.addEventListener('change', (e) => {
    chatManager.addFiles(Array.from(e.target.files));
    e.target.value = '';
});
clearChatBtn.addEventListener('click', () => chatManager.clear());

// ========== 分析按钮 ==========
analyzeMomentBtn.addEventListener('click', async () => {
    const keys = [];
    for (const file of momentManager.files) {
        try {
            const key = await uploadImage(file);
            keys.push(key);
        } catch (err) {
            showMessage('error', `上传失败: ${err.message}`);
            return;
        }
    }
    submitTask('moment', keys);
});

analyzeChatBtn.addEventListener('click', async () => {
    const keys = [];
    for (const file of chatManager.files) {
        try {
            const key = await uploadImage(file);
            keys.push(key);
        } catch (err) {
            showMessage('error', `上传失败: ${err.message}`);
            return;
        }
    }
    submitTask('chat', keys);
});

// ========== 房树人画板 ==========
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX, lastY;
let pendingDraw = false;
let canvasHistory = [];

function saveCanvasState() {
    canvasHistory.push(canvas.toDataURL());
    if (canvasHistory.length > 20) canvasHistory.shift();
}

function restoreCanvasState() {
    if (canvasHistory.length === 0) return;
    canvasHistory.pop();
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = canvasHistory.length > 0 ? canvasHistory[canvasHistory.length - 1] : '';
    analyzeHtpBtn.disabled = canvasHistory.length === 0;
}

function drawLine(x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = penColor.value;
    ctx.lineWidth = penWidth.value;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function handleDrawStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    drawing = true;
    lastX = x;
    lastY = y;
    saveCanvasState();
}

function handleDrawMove(e) {
    e.preventDefault();
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    if (!pendingDraw) {
        pendingDraw = true;
        requestAnimationFrame(() => {
            if (drawing && lastX !== undefined && lastY !== undefined) {
                drawLine(lastX, lastY, x, y);
            }
            lastX = x;
            lastY = y;
            pendingDraw = false;
        });
    }
}

function handleDrawEnd(e) {
    e.preventDefault();
    drawing = false;
    analyzeHtpBtn.disabled = false;
}

canvas.addEventListener('mousedown', handleDrawStart);
canvas.addEventListener('mousemove', handleDrawMove);
canvas.addEventListener('mouseup', handleDrawEnd);
canvas.addEventListener('mouseleave', handleDrawEnd);
canvas.addEventListener('touchstart', handleDrawStart, { passive: false });
canvas.addEventListener('touchmove', handleDrawMove, { passive: false });
canvas.addEventListener('touchend', handleDrawEnd);

clearCanvasBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvasHistory = [];
    analyzeHtpBtn.disabled = true;
});

undoCanvasBtn.addEventListener('click', restoreCanvasState);

clearHtpBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvasHistory = [];
    analyzeHtpBtn.disabled = true;
});

analyzeHtpBtn.addEventListener('click', async () => {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    try {
        const key = await uploadImage(blob);
        submitTask('htp', [key]);
    } catch (err) {
        showMessage('error', `上传失败: ${err.message}`);
    }
});

// ========== 导出功能 ==========
async function exportAsImage() {
    if (!resultContainer.innerHTML) return;
    const canvas = await html2canvas(resultContainer);
    const link = document.createElement('a');
    link.download = `innerverse-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

function exportAsPDF() {
    if (!resultContainer.innerHTML) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.html(resultContainer, {
        callback: (doc) => {
            doc.save(`innerverse-${Date.now()}.pdf`);
        },
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 800
    });
}

exportImageBtn.addEventListener('click', exportAsImage);
exportPdfBtn.addEventListener('click', exportAsPDF);

// ========== 公告 ==========
async function loadAnnouncement() {
    try {
        const res = await fetch('/api/announcement');
        const data = await res.json();
        if (data.success && data.data.content) {
            announcementText.innerHTML = DOMPurify.sanitize(data.data.content);
            const closed = localStorage.getItem('announcementClosed');
            if (!closed || closed !== data.data.content) {
                announcementBar.style.display = 'flex';
            } else {
                announcementBar.style.display = 'none';
            }
        } else {
            announcementBar.style.display = 'none';
        }
    } catch (err) {
        console.error('Failed to load announcement:', err);
        announcementBar.style.display = 'none';
    }
}
closeAnnouncement.addEventListener('click', () => {
    announcementBar.style.display = 'none';
    if (announcementText.innerHTML) {
        localStorage.setItem('announcementClosed', announcementText.innerHTML);
    }
});

// 初始化
loadAnnouncement();
