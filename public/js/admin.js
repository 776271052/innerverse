let adminSecret = sessionStorage.getItem('adminSecret') || '';
const API = '/api';

// ========== API 调用封装 ==========
async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Secret': adminSecret,
            ...options.headers
        }
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
}

// ========== 登录 ==========
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

// ========== 退出 ==========
window.logout = function() {
    sessionStorage.removeItem('adminSecret');
    location.reload();
};

// ========== 仪表盘 ==========
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
        data: {
            labels: stats.daily.map(d => d.day),
            datasets: [{
                label: '任务量',
                data: stats.daily.map(d => d.count),
                borderColor: '#2EBD85',
                tension: 0.3,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    const ctx2 = document.getElementById('providerChart').getContext('2d');
    if (providerChart) providerChart.destroy();
    providerChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: stats.providers.map(p => p.provider || 'unknown'),
            datasets: [{
                label: '调用次数',
                data: stats.providers.map(p => p.count),
                backgroundColor: '#2EBD85'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ========== 加载配置 ==========
async function loadConfigs() {
    const configs = await apiCall('/config');
    const keys = [
        'ai_provider',
        'siliconflow_api_key',
        'deepseek_api_key',
        'cloudflare_account_id',
        'cloudflare_api_token',
        'admin_secret',
        'announcement',
        'model_siliconflow_text',
        'model_siliconflow_vision',
        'model_deepseek_text',
        'model_deepseek_vision',
        'model_cloudflare_text',
        'model_cloudflare_vision'
    ];
    keys.forEach(key => {
        const el = document.getElementById(`cfg_${key}`);
        if (el) {
            const config = configs.find(c => c.key === key);
            if (config) el.value = config.value;
        }
    });
}

// ========== 保存配置 ==========
document.getElementById('saveAllConfigs').addEventListener('click', async () => {
    const keys = [
        'ai_provider',
        'siliconflow_api_key',
        'deepseek_api_key',
        'cloudflare_account_id',
        'cloudflare_api_token',
        'admin_secret',
        'announcement',
        'model_siliconflow_text',
        'model_siliconflow_vision',
        'model_deepseek_text',
        'model_deepseek_vision',
        'model_cloudflare_text',
        'model_cloudflare_vision'
    ];
    try {
        for (const key of keys) {
            const value = document.getElementById(`cfg_${key}`).value;
            await apiCall('/config-update', {
                method: 'POST',
                body: JSON.stringify({ key, value })
            });
        }
        alert('配置已保存');
    } catch (e) {
        alert('保存失败: ' + e.message);
    }
});

// ========== 选项卡切换 ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${this.dataset.tab}`).classList.add('active');

        if (this.dataset.tab === 'tasks') {
            loadTasks();
        }
    });
});

// ========== 任务列表 ==========
async function loadTasks(page = 1) {
    const status = document.getElementById('filterStatus').value;
    const type = document.getElementById('filterType').value;
    const search = document.getElementById('searchTaskId').value;

    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    const data = await apiCall(`/tasks?${params}`);
    const tbody = document.getElementById('tasksTableBody');

    tbody.innerHTML = data.tasks.map(task => `
        <tr>
            <td>${task.id.slice(0, 8)}...</td>
            <td>${task.type === 'moment' ? '朋友圈' : task.type === 'chat' ? '聊天' : '房树人'}</td>
            <td>${task.status}</td>
            <td>${task.provider || '-'}</td>
            <td>${new Date(task.created_at * 1000).toLocaleString()}</td>
            <td><button onclick="viewTask('${task.id}')">查看</button></td>
        </tr>
    `).join('');
}

window.viewTask = async (id) => {
    const task = await apiCall(`/task?id=${id}`);
    alert(`类型: ${task.type}\n状态: ${task.status}\n结果:\n${task.result || task.error || '无'}`);
};

document.getElementById('searchTasksBtn').addEventListener('click', () => loadTasks());

// ========== 自动登录 ==========
if (adminSecret) {
    apiCall('/auth', { method: 'POST', body: JSON.stringify({ secret: adminSecret }) })
        .then(() => {
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadDashboard();
            loadConfigs();
        })
        .catch(() => {
            sessionStorage.removeItem('adminSecret');
            adminSecret = '';
        });
}
