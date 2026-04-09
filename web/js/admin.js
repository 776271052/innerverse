let adminSecret = sessionStorage.getItem('adminSecret') || '';
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

window.logout = function() {
    sessionStorage.removeItem('adminSecret');
    location.reload();
};

// 仪表盘
let trendChart, providerChart;
async function loadDashboard() {
    const stats = await apiCall('/stats');
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('successTasks').textContent = stats.success;
    document.getElementById('failedTasks').textContent = stats.failed;
    
    const ctx1 = document.getElementById('trendChart').getContext('2d');
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx1, {
        type: 'line',
        data: { labels: stats.daily.map(d=>d.day), datasets: [{ label: '任务量', data: stats.daily.map(d=>d.count), borderColor: '#07C160', tension:0.3 }] }
    });
    const ctx2 = document.getElementById('providerChart').getContext('2d');
    if (providerChart) providerChart.destroy();
    providerChart = new Chart(ctx2, {
        type: 'bar',
        data: { labels: stats.providers.map(p=>p.provider||'unknown'), datasets: [{ label: '调用次数', data: stats.providers.map(p=>p.count), backgroundColor: '#07C160' }] }
    });
}

// 配置
async function loadConfigs() {
    const configs = await apiCall('/config');
    configs.forEach(c => {
        const el = document.getElementById(`cfg_${c.key}`);
        if (el) el.value = c.value;
    });
}

document.getElementById('saveAllConfigs').addEventListener('click', async () => {
    const keys = ['ai_provider','siliconflow_api_key','deepseek_api_key','cloudflare_account_id','cloudflare_api_token','admin_secret','announcement'];
    for (const k of keys) {
        const val = document.getElementById(`cfg_${k}`).value;
        await apiCall('/config-update', { method: 'POST', body: JSON.stringify({ key: k, value: val }) });
    }
    alert('配置已保存');
});

// 选项卡
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');
    if (this.dataset.tab === 'tasks') loadTasks();
}));

// 任务列表
async function loadTasks(page = 1) {
    const status = document.getElementById('filterStatus').value;
    const type = document.getElementById('filterType').value;
    const params = new URLSearchParams({ page, limit: 20, status, type });
    const data = await apiCall(`/tasks?${params}`);
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = data.tasks.map(t => `<tr><td>${t.id.slice(0,8)}</td><td>${t.type}</td><td>${t.status}</td><td>${t.provider}</td><td>${new Date(t.created_at*1000).toLocaleString()}</td><td><button onclick="viewTask('${t.id}')">查看</button></td></tr>`).join('');
    // 分页略
}
window.viewTask = async (id) => {
    const task = await apiCall(`/task?id=${id}`);
    alert(JSON.stringify(task, null, 2));
};
document.getElementById('searchTasksBtn').addEventListener('click', () => loadTasks());

// 自动登录
if (adminSecret) {
    apiCall('/auth', { method: 'POST', body: JSON.stringify({ secret: adminSecret }) })
        .then(() => {
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadDashboard();
            loadConfigs();
        })
        .catch(() => { sessionStorage.removeItem('adminSecret'); adminSecret = ''; });
}
