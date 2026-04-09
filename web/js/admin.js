let adminSecret = '';
const API = '/api';

async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': adminSecret, ...options.headers }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

// 登录
document.getElementById('loginBtn').addEventListener('click', async () => {
    const secret = document.getElementById('adminSecret').value;
    adminSecret = secret;
    try {
        await apiCall('/auth', { method: 'POST', body: JSON.stringify({ secret }) });
        sessionStorage.setItem('adminSecret', secret);
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadDashboard();
        loadConfigs();
    } catch (e) {
        document.getElementById('loginError').textContent = e.message;
    }
});

function logout() {
    sessionStorage.removeItem('adminSecret');
    location.reload();
}

// 仪表盘
async function loadDashboard() {
    const stats = await apiCall('/stats');
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('successTasks').textContent = stats.success;
    document.getElementById('failedTasks').textContent = stats.failed;
    
    const ctx1 = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx1, { type: 'line', data: { labels: stats.daily.map(d=>d.day), datasets: [{ label: '任务量', data: stats.daily.map(d=>d.count), borderColor: '#07C160' }] } });
    const ctx2 = document.getElementById('providerChart').getContext('2d');
    new Chart(ctx2, { type: 'bar', data: { labels: stats.providers.map(p=>p.provider), datasets: [{ label: '调用次数', data: stats.providers.map(p=>p.count), backgroundColor: '#07C160' }] } });
}

// 加载配置
async function loadConfigs() {
    const configs = await apiCall('/config');
    configs.forEach(c => {
        const el = document.getElementById(`cfg_${c.key}`);
        if (el) el.value = c.value;
    });
}

// 保存配置
document.getElementById('saveAllConfigs').addEventListener('click', async () => {
    const keys = ['ai_provider','siliconflow_api_key','deepseek_api_key','cloudflare_account_id','cloudflare_api_token','admin_secret','announcement'];
    for (const k of keys) {
        const val = document.getElementById(`cfg_${k}`).value;
        await apiCall('/config-update', { method: 'POST', body: JSON.stringify({ key: k, value: val }) });
    }
    alert('配置已保存');
});

// 任务列表（略，可扩展）
// 选项卡切换
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');
}));

// 自动登录
if (sessionStorage.getItem('adminSecret')) {
    adminSecret = sessionStorage.getItem('adminSecret');
    document.getElementById('loginPanel').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadDashboard();
    loadConfigs();
}
