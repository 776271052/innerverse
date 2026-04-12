// 内心宇宙 2.0 - 完整 JavaScript 代码
let currentMode = 'moment';
let chatScope = 'private';
const uploadedFiles = [];
let analyzing = false;
let currentPage = 'home';

// 页面元素引用
const pages = {
    home: document.getElementById('homePage'),
    upload: document.getElementById('uploadPage'),
    draw: document.getElementById('drawPage'),
    tracker: document.getElementById('trackerPage'),
    assistant: document.getElementById('assistantPage'),
    community: document.getElementById('communityPage'),
    profile: document.getElementById('profilePage')
};

const navItems = document.querySelectorAll('.nav-item');
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
const exportCaptureArea = document.getElementById('exportCaptureArea');

// 情绪追踪相关元素
const emojiSliders = document.querySelectorAll('.emoji');
const journalInput = document.getElementById('journalInput');
const saveJournalBtn = document.getElementById('saveJournalBtn');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const currentMonthYear = document.getElementById('currentMonthYear');

// AI助手相关元素
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// 本地存储
const STORAGE_KEYS = {
    ANALYSIS_HISTORY: 'innerverse_analysis_history',
    EMOTION_TRACKING: 'innerverse_emotion_tracking',
    USER_PREFERENCES: 'innerverse_user_preferences'
};

// 色彩方案
const colorSchemes = {
    moment: { 
        E:'#FF9F43', I:'#5A9CFF', S:'#A0785A', N:'#9B6B9E', 
        T:'#26C6DA', F:'#FF8A80', J:'#2E7D32', P:'#FFD54F' 
    },
    chat_private: { directness:'#FF6B6B', rationality:'#4DABF7', initiative:'#F59F00', closeness:'#FAA2C1' },
    chat_group: { activity:'#FF9F43', leadership:'#5A9CFF', positivity:'#51CF66', role:'#B0B7FF' },
    htp: { security:'#2F9E44', family:'#FD7E14', self:'#20C997', growth:'#8CE99A', openness:'#3BC9DB' }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 设置底部导航
    setupBottomNavigation();
    
    // 设置分析卡片点击事件
    setupAnalysisCards();
    
    // 设置上传页面事件
    setupUploadPage();
    
    // 设置画板
    setupCanvas();
    
    // 设置情绪追踪
    setupEmotionTracker();
    
    // 设置AI助手
    setupAssistant();
    
    // 加载历史数据
    loadAnalysisHistory();
}

// 设置底部导航
function setupBottomNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageName = this.dataset.page;
            switchPage(pageName);
        });
    });
}

// 切换页面
function switchPage(pageName) {
    // 隐藏所有页面
    Object.values(pages).forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    pages[pageName].classList.add('active');
    
    // 更新导航状态
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
    
    currentPage = pageName;
    
    // 特殊处理：切换到首页时刷新最近报告
    if (pageName === 'home') {
        loadAnalysisHistory();
    }
}

// 设置分析卡片点击事件
function setupAnalysisCards() {
    document.querySelectorAll('.analysis-card').forEach(card => {
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
}

// 设置上传页面
function setupUploadPage() {
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
    uploadArea.addEventListener('dragover', e => { 
        e.preventDefault(); 
        uploadArea.style.background = '#F9FFF9'; 
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

    document.getElementById('clearUploadBtn').addEventListener('click', () => { 
        uploadedFiles.length = 0; 
        renderFileList(); 
        analyzeUploadBtn.disabled = true; 
    });
}

// 添加文件
function addFiles(files) {
    for (const f of files) {
        if (uploadedFiles.length >= 3) { alert('最多3张'); break; }
        if (f.size > 10 * 1024 * 1024) { alert('图片不超过10MB'); continue; }
        uploadedFiles.push(f);
    }
    renderFileList();
    analyzeUploadBtn.disabled = uploadedFiles.length === 0;
}

// 渲染文件列表
function renderFileList() {
    filePreview.innerHTML = uploadedFiles.map((f, i) => `
        <div class="file-item">
            <span><i class="fas fa-image"></i> ${f.name}</span>
            <button class="remove-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}

// 移除文件
window.removeFile = i => { 
    uploadedFiles.splice(i, 1); 
    renderFileList(); 
    analyzeUploadBtn.disabled = uploadedFiles.length === 0; 
};

// 压缩图片
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

// 文件转Base64
function fileToBase64(file) {
    return new Promise((r, e) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result);
        reader.onerror = e;
        reader.readAsDataURL(file);
    });
}

// 更新进度消息
function updateProgressMessage(stepIndex) {
    if (!msgContainer) return;
    const progressSteps = ['📤 正在上传图片...', '🔍 AI 正在分析中...', '📝 即将完成...'];
    msgContainer.innerHTML = `
        <div class="msg msg-progress">
            <i class="fas fa-spinner fa-pulse"></i>
            <span>${progressSteps[stepIndex] || '处理中...'}</span>
        </div>
    `;
}

// 绘制圆形进度
function drawCircularProgress(canvas, percent, color) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const centerX = w / 2, centerY = h / 2, radius = 32, lineWidth = 6;
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

// 渲染结果
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

    const dimensionLabels = {
        E: ['外向', '内向'], I: ['外向', '内向'],
        S: ['实感', '直觉'], N: ['实感', '直觉'],
        T: ['思考', '情感'], F: ['思考', '情感'],
        J: ['判断', '感知'], P: ['判断', '感知']
    };

    let html = `
        <div class="report-header">
            <div class="mbti-badge">${mbtiType || ''}</div>
            <div class="user-nickname">小花/小橘的铲屎官</div>
        </div>
    `;

    html += '<div class="dimensions-grid">';
    const canvasIds = [];
    const dims = Object.entries(dimensions);
    for (const [key, value] of dims) {
        const percent = typeof value === 'number' ? value : parseInt(value) || 50;
        const color = colorMap[key] || '#07C160';
        const canvasId = `canvas-${key}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        canvasIds.push({ id: canvasId, percent, color });
        const labels = dimensionLabels[key] || [key, ''];
        html += `<div class="dimension-item">`;
        html += `<canvas class="dimension-canvas" id="${canvasId}" width="80" height="80"></canvas>`;
        html += `<div class="dimension-labels"><span>${labels[0]}</span><span>${labels[1]}</span></div>`;
        html += `<div class="dimension-value">${percent}%</div>`;
        html += `</div>`;
    }
    html += '</div>';

    html += `<div class="section-title">核心特质</div>`;
    html += `<div><span class="trait-tag">温暖细腻的守护者</span><span class="trait-tag">注重细节与情感联结</span><span class="trait-tag">偏好稳定温馨的日常</span></div>`;

    html += `<div class="section-title">职场与社交</div>`;
    html += `<p>在职场中偏向支持性角色，善于团队协作与细节维护，社交中温和友善但可能偏好小范围深度交流。</p>`;

    html += `<div class="section-title">情感与人际</div>`;
    html += `<p>通过具体行动（如记录、照顾）表达情感，重视亲密关系的稳定性与日常陪伴，情感模式细腻而持久。</p>`;

    html += `<div class="section-title">亚优势/挑战</div>`;
    html += `<div class="challenge-item">优势：情感细腻，善于捕捉生活温暖瞬间、忠诚可靠，对喜爱的人事物充满关怀、务实耐心，能长期记录与陪伴</div>`;
    html += `<div class="challenge-item">挑战：可能过于关注细节而忽略宏观变化、情感依赖较强，易因分离产生焦虑、习惯性内敛，可能不擅长主动拓展社交圈</div>`;

    html += `<div class="section-title">Q维度深度解读</div>`;
    html += `<div class="insight-text">`;
    html += `I（内倾）：动态集中于个人生活记录，未体现广泛社交互动；S（实感）：内容聚焦具体猫咪细节、体重、时间节点等现实元素；`;
    html += `F（情感）：文字充满爱意、幽默与主观情感表达；J（判断）：朋友圈按时间顺序整齐排列，体现对秩序与记录的偏好。`;
    html += `</div>`;

    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';

    canvasIds.forEach(({ id, percent, color }) => {
        const canvas = document.getElementById(id);
        if (canvas) drawCircularProgress(canvas, percent, color);
    });

    exportBtnWrapper.style.display = 'block';
    
    // 保存到历史记录
    saveAnalysisToHistory(parsedData, rawText);
}

// 保存分析到历史记录
function saveAnalysisToHistory(parsedData, rawText) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSIS_HISTORY) || '[]');
    history.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: parsedData.type || currentMode,
        mbtiType: parsedData.mbtiType,
        summary: rawText.substring(0, 100) + '...',
        fullData: parsedData
    });
    
    // 限制历史记录数量
    if (history.length > 20) {
        history.splice(20);
    }
    
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_HISTORY, JSON.stringify(history));
}

// 加载分析历史
function loadAnalysisHistory() {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSIS_HISTORY) || '[]');
    const container = document.querySelector('.reports-container');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;">暂无分析记录</p>';
        return;
    }
    
    container.innerHTML = history.slice(0, 5).map(record => `
        <div class="report-preview">
            <div class="report-type">${getAnalysisTypeName(record.type)}</div>
            <div class="report-date">${formatDate(record.timestamp)}</div>
            <div class="report-result">${record.mbtiType || record.summary}</div>
        </div>
    `).join('');
}

// 获取分析类型名称
function getAnalysisTypeName(type) {
    const names = {
        'moment': 'MBTI人格分析',
        'chat': '聊天风格分析',
        'htp': '房树人绘画分析',
        'emotional': '情绪状态评估'
    };
    return names[type] || '心理分析';
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 提交分析
async function submitAnalysis(type, imageBase64Array, selfDesc = '') {
    if (analyzing) return;
    analyzing = true;

    let step = 0;
    updateProgressMessage(step);
    const progressInterval = setInterval(() => {
        step = (step + 1) % 3; // 3个步骤
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

        renderResult(parsedData, rawText);
    } catch (e) {
        clearInterval(progressInterval);
        msgContainer.innerHTML = `<div class="msg msg-error"><i class="fas fa-exclamation-circle"></i><span>${e.message}</span></div>`;
    } finally {
        analyzing = false;
    }
}

// 分析按钮事件
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

// 导出带二维码的图片
async function exportWithQRCode() {
    if (!exportCaptureArea) return;
    try {
        const canvas = await html2canvas(exportCaptureArea, {
            scale: 3,
            backgroundColor: '#EDEDED',
            allowTaint: false,
            useCNAME: true,
            logging: false
        });
        
        const qr = qrcode(0, 'M');
        qr.addData('https://innerverse.776271052.xyz/');
        qr.make();
        const qrSize = 130;
        const qrDataURL = qr.createDataURL(12, 0);
        
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        finalCanvas.width = canvas.width;
        finalCanvas.height = canvas.height;
        ctx.drawImage(canvas, 0, 0);
        
        const qrImg = new Image();
        await new Promise(resolve => { qrImg.onload = resolve; qrImg.src = qrDataURL; });
        const padding = 28;
        const qrX = finalCanvas.width - qrSize - padding;
        const qrY = finalCanvas.height - qrSize - padding;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 12;
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.shadowColor = 'transparent';
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        
        ctx.font = '500 15px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#111111';
        ctx.textAlign = 'right';
        ctx.fillText('扫码访问网站', qrX + qrSize/2, qrY - 14);
        
        const link = document.createElement('a');
        link.download = `innerverse-${Date.now()}.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        alert('导出失败: ' + e.message);
    }
}

exportImageBtn.addEventListener('click', exportWithQRCode);

// 返回首页
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
    
    // 更新导航状态
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === 'home') {
            item.classList.add('active');
        }
    });
};

// 房树人画板初始化
function initCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    window.history = [];
    saveState();
}

function setupCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let drawing = false, eraser = false, lastX, lastY, history = [], MAX_HISTORY = 30;
    
    window.saveState = function() {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (history.length > MAX_HISTORY) history.shift();
    };
    
    window.undo = function() {
        if (history.length > 1) {
            history.pop();
            ctx.putImageData(history[history.length - 1], 0, 0);
        }
    };
    
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { 
            x: Math.min(canvas.width, Math.max(0, (cx - rect.left) * sx)), 
            y: Math.min(canvas.height, Math.max(0, (cy - rect.top) * sy)) 
        };
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
        if (!drawing) return;
        const { x, y } = getCoords(e);
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
        const dataURL = canvas.toDataURL('image/jpeg', 0.7);
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
}

// 设置情绪追踪
function setupEmotionTracker() {
    // 情绪评分
    emojiSliders.forEach(emoji => {
        emoji.addEventListener('click', function() {
            const level = this.dataset.level;
            document.querySelectorAll('.emoji').forEach(e => e.classList.remove('selected'));
            this.classList.add('selected');
            
            const emotions = {
                '1': '😭 很糟糕',
                '2': '😢 不太好',
                '3': '😐 一般',
                '4': '🙂 还不错',
                '5': '😄 很开心'
            };
            
            document.querySelector('.rating-display').textContent = emotions[level];
        });
    });
    
    // 日记输入计数
    if (journalInput) {
        journalInput.addEventListener('input', e => {
            document.getElementById('journalCharCount').textContent = e.target.value.length;
        });
    }
    
    // 保存日记
    if (saveJournalBtn) {
        saveJournalBtn.addEventListener('click', saveJournalEntry);
    }
    
    // 日历导航
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => changeMonth(-1));
        nextMonthBtn.addEventListener('click', () => changeMonth(1));
    }
    
    // 初始化日历
    renderCalendar();
}

// 保存日记条目
function saveJournalEntry() {
    const selectedEmoji = document.querySelector('.emoji.selected');
    const emotionLevel = selectedEmoji ? selectedEmoji.dataset.level : null;
    const journalText = journalInput.value.trim();
    
    if (!emotionLevel) {
        alert('请选择今天的心情');
        return;
    }
    
    const today = new Date();
    const dateKey = formatDateKey(today);
    
    const trackingData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOTION_TRACKING) || '{}');
    trackingData[dateKey] = {
        emotion: emotionLevel,
        journal: journalText,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.EMOTION_TRACKING, JSON.stringify(trackingData));
    
    // 清空输入
    document.querySelectorAll('.emoji').forEach(e => e.classList.remove('selected'));
    journalInput.value = '';
    document.getElementById('journalCharCount').textContent = '0';
    document.querySelector('.rating-display').textContent = '选择你今天的心情';
    
    // 重新渲染日历
    renderCalendar();
    
    alert('记录已保存！');
}

// 格式化日期键
function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 渲染日历
function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    currentMonthYear.textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    calendarGrid.innerHTML = '';
    
    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.style.fontWeight = 'bold';
        dayElement.style.opacity = '0.7';
        calendarGrid.appendChild(dayElement);
    });
    
    // 添加空白格子（月初之前）
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // 添加日期格子
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateElement = document.createElement('div');
        dateElement.className = 'calendar-day';
        dateElement.textContent = day;
        
        // 检查是否有记录
        const currentDate = new Date(year, month, day);
        const dateKey = formatDateKey(currentDate);
        const trackingData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOTION_TRACKING) || '{}');
        
        if (trackingData[dateKey]) {
            dateElement.classList.add('has-record');
        }
        
        // 标记今天
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateElement.classList.add('today');
        }
        
        calendarGrid.appendChild(dateElement);
    }
}

// 切换月份
function changeMonth(direction) {
    const current = new Date(currentMonthYear.textContent.replace('年', '-').replace('月', '').split('-')[0], 
                             parseInt(currentMonthYear.textContent.replace('年', '-').replace('月', '').split('-')[1]) - 1);
    current.setMonth(current.getMonth() + direction);
    
    currentMonthYear.textContent = `${current.getFullYear()}年${current.getMonth() + 1}月`;
    
    // 重新渲染日历
    const year = current.getFullYear();
    const month = current.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    // 添加星期标题
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.style.fontWeight = 'bold';
        dayElement.style.opacity = '0.7';
        calendarGrid.appendChild(dayElement);
    });
    
    // 添加空白格子（月初之前）
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // 添加日期格子
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateElement = document.createElement('div');
        dateElement.className = 'calendar-day';
        dateElement.textContent = day;
        
        // 检查是否有记录
        const currentDate = new Date(year, month, day);
        const dateKey = formatDateKey(currentDate);
        const trackingData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOTION_TRACKING) || '{}');
        
        if (trackingData[dateKey]) {
            dateElement.classList.add('has-record');
        }
        
        // 标记今天
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dateElement.classList.add('today');
        }
        
        calendarGrid.appendChild(dateElement);
    }
}

// 设置AI助手
function setupAssistant() {
    // 发送消息
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 自动调整输入框高度
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight > 120 ? 120 : this.scrollHeight) + 'px';
        });
    }
    
    // 助手功能卡片
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function() {
            const feature = this.dataset.feature;
            handleAssistantFeature(feature);
        });
    });
}

// 发送消息
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // 添加用户消息
    addMessageToChat(message, 'user');
    
    // 清空输入框
    messageInput.value = '';
    messageInput.style.height = '40px';
    
    // 模拟AI回复（实际应用中应调用API）
    setTimeout(() => {
        const responses = [
            "感谢你分享这些感受。能告诉我更多细节吗？",
            "听起来你现在有些困扰，这是很正常的。让我们一起分析一下。",
            "我理解你的感受。每个人都会有这样的时刻，重要的是要学会应对。",
            "这是一个很好的反思。你觉得自己可以从中学到什么？",
            "记住，情绪是暂时的，它们会过去的。你并不孤单。"
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessageToChat(randomResponse, 'bot');
    }, 1000);
}

// 添加消息到聊天
function addMessageToChat(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.innerHTML = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerHTML = `<p>${content}</p>`;
    
    messageDiv.appendChild(sender === 'bot' ? avatarDiv : contentDiv);
    messageDiv.appendChild(sender === 'bot' ? contentDiv : avatarDiv);
    
    chatContainer.appendChild(messageDiv);
    
    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 处理助手功能
function handleAssistantFeature(feature) {
    let content = '';
    
    switch(feature) {
        case 'cbt':
            content = "认知行为疗法练习：请识别一个让你感到焦虑的想法，然后问自己：这个想法是事实还是假设？有什么证据支持或反驳它？";
            break;
        case 'breathing':
            content = "4-7-8呼吸法：吸气4秒，屏息7秒，呼气8秒。重复3-4次，可以帮助你平静下来。";
            break;
        case 'gratitude':
            content = "感恩日记：写下今天让你感激的三件事，无论多小都可以。这有助于培养积极心态。";
            break;
        case 'mindfulness':
            content = "正念练习：专注于当下的感受，深呼吸，注意身体的感觉。不要评判，只是观察。";
            break;
        default:
            content = "这是一个有用的心理练习功能，点击开始体验吧！";
    }
    
    addMessageToChat(content, 'bot');
}

// 添加新功能：个性化成长路径
function generatePersonalizedPath() {
    // 基于用户的历史分析和情绪记录生成个性化建议
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSIS_HISTORY) || '[]');
    const trackingData = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMOTION_TRACKING) || '{}');
    
    // 示例逻辑：根据分析类型和情绪趋势提供建议
    const recommendations = [];
    
    if (history.length > 0) {
        // 分析用户的MBTI类型趋势
        const mbtiTypes = history.filter(h => h.mbtiType).map(h => h.mbtiType);
        const mostCommonType = mbtiTypes.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        
        const topType = Object.keys(mostCommonType).reduce((a, b) => 
            mostCommonType[a] > mostCommonType[b] ? a : b
        );
        
        recommendations.push(`您的主要人格类型是 ${topType}，我们为您推荐相应的成长资源`);
    }
    
    // 分析情绪趋势
    const recentDates = Object.keys(trackingData).sort().slice(-7);
    if (recentDates.length >= 7) {
        const recentEmotions = recentDates.map(date => trackingData[date].emotion);
        const avgEmotion = recentEmotions.reduce((sum, val) => sum + parseInt(val), 0) / recentEmotions.length;
        
        if (avgEmotion < 3) {
            recommendations.push("您近期情绪偏低，建议尝试放松练习或寻求支持");
        } else {
            recommendations.push("您近期情绪稳定，继续保持良好的心理状态");
        }
    }
    
    return recommendations;
}

// 添加新功能：心理健康小贴士
function getDailyWellnessTip() {
    const tips = [
        "每天花几分钟进行深呼吸练习，有助于缓解压力",
        "保持规律的作息时间，有助于维持情绪稳定",
        "与信任的朋友分享你的感受，可以获得情感支持",
        "进行适度的运动，可以释放内啡肽，提升心情",
        "尝试写感恩日记，关注生活中的积极面",
        "学会说‘不’，避免过度承诺带来的压力",
        "保持充足的睡眠，对心理健康至关重要",
        "定期进行自我反思，了解自己的情绪模式",
        "培养兴趣爱好，丰富生活内容",
        "寻求专业帮助是勇敢的表现，不要犹豫"
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
}

// 在页面加载完成后显示欢迎提示
setTimeout(() => {
    if (!localStorage.getItem('innerverse_welcome_shown')) {
        alert('欢迎来到内心宇宙！在这里，您可以探索自己的内心世界，记录情绪变化，获得个性化心理支持。');
        localStorage.setItem('innerverse_welcome_shown', 'true');
    }
}, 1000);
