// api/index.js
// 统一 API 入口，根据路径分发到不同处理函数

import { uploadImage } from './lib/blob.js';
import { query, getConfig, setConfig, getAllConfigs } from './lib/db.js';
import { analyzeWithAI } from './lib/ai-client.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';
import { v4 as uuidv4 } from 'uuid';

// ========== 处理函数定义 ==========

// POST /api/upload
async function handleUpload(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const limit = checkRateLimit(ip, 10, 60);
    if (!limit.allowed) return res.status(429).json(error(`请求频繁，${limit.resetIn}秒后重试`, 429));

    try {
        const form = await req.formData();
        const file = form.get('file');
        if (!file) return res.status(400).json(error('未提供文件'));
        if (!file.type.startsWith('image/')) return res.status(400).json(error('仅支持图片'));
        if (file.size > 10 * 1024 * 1024) return res.status(400).json(error('图片不超过10MB'));

        const url = await uploadImage(file);
        return res.json(success({ url }));
    } catch (e) {
        console.error('Upload error:', e);
        return res.status(500).json(error('上传失败'));
    }
}

// POST /api/analyze
async function handleAnalyze(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const limit = checkRateLimit(ip, 5, 60);
    if (!limit.allowed) return res.status(429).json(error(`请求频繁，${limit.resetIn}秒后重试`, 429));

    try {
        const { type, images, selfDesc } = req.body;
        if (!type || !['moment', 'chat', 'htp'].includes(type)) return res.status(400).json(error('无效分析类型'));
        if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
            return res.status(400).json(error('图片数量1-3张'));
        }

        const taskId = uuidv4();
        const provider = await getConfig('ai_provider', 'siliconflow');
        const now = Math.floor(Date.now() / 1000);

        await query(
            `INSERT INTO tasks (id, type, status, provider, images, self_desc, created_at, updated_at)
             VALUES (?, ?, 'processing', ?, ?, ?, ?, ?)`,
            [taskId, type, provider, JSON.stringify(images), selfDesc || '', now, now]
        );
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'total'`);

        const result = await analyzeWithAI(type, images, selfDesc);
        const completedAt = Math.floor(Date.now() / 1000);
        await query(
            `UPDATE tasks SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
            [result, completedAt, completedAt, taskId]
        );
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'success'`);

        return res.json(success({ taskId, result }));
    } catch (e) {
        console.error('Analyze error:', e);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'failed'`);
        return res.status(500).json(error(e.message));
    }
}

// GET /api/task
async function handleGetTask(req, res) {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return res.status(400).json(error('缺少任务ID'));

    try {
        const r = await query(`SELECT id, type, status, result, error, created_at FROM tasks WHERE id = ?`, [id]);
        if (!r.results?.length) return res.status(404).json(error('任务不存在'));
        return res.json(success(r.results[0]));
    } catch (e) {
        return res.status(500).json(error('查询失败'));
    }
}

// GET /api/tasks (管理后台)
async function handleListTasks(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const status = url.searchParams.get('status') || '';
    const type = url.searchParams.get('type') || '';
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (type) { where.push('type = ?'); params.push(type); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    try {
        const countR = await query(`SELECT COUNT(*) as total FROM tasks ${whereClause}`, params);
        const total = countR.results[0].total;

        const dataR = await query(
            `SELECT id, type, status, provider, created_at FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        return res.json(success({ tasks: dataR.results, total, page, limit }));
    } catch (e) {
        return res.status(500).json(error('查询失败'));
    }
}

// GET /api/stats
async function handleStats(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));

    try {
        const totalR = await query(`SELECT value FROM stats WHERE name = 'total'`);
        const successR = await query(`SELECT value FROM stats WHERE name = 'success'`);
        const failedR = await query(`SELECT value FROM stats WHERE name = 'failed'`);
        
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
        const dailyR = await query(
            `SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY day ORDER BY day`,
            [sevenDaysAgo]
        );
        const providerR = await query(
            `SELECT provider, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY provider`,
            [sevenDaysAgo]
        );

        return res.json(success({
            total: totalR.results[0]?.value || 0,
            success: successR.results[0]?.value || 0,
            failed: failedR.results[0]?.value || 0,
            daily: dailyR.results,
            providers: providerR.results
        }));
    } catch (e) {
        return res.status(500).json(error('统计失败'));
    }
}

// GET /api/announcement
async function handleAnnouncement(req, res) {
    const content = await getConfig('announcement', '');
    return res.json(success({ content }));
}

// GET /api/config
async function handleGetConfig(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    try {
        const configs = await getAllConfigs();
        return res.json(success(configs));
    } catch (e) {
        return res.status(500).json(error('获取配置失败'));
    }
}

// POST /api/config-update
async function handleUpdateConfig(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));

    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json(error('缺少 key'));
        await setConfig(key, value);
        return res.json(success());
    } catch (e) {
        return res.status(500).json(error('更新失败'));
    }
}

// POST /api/auth
async function handleAuth(req, res) {
    if (await verifyAdmin(req)) {
        return res.json(success({ authenticated: true }));
    }
    return res.status(401).json(error('密钥错误', 401));
}

// GET /api/health
async function handleHealth(req, res) {
    res.json({ status: 'ok', timestamp: Date.now() });
}

// ========== 路由分发 ==========
export default async function handler(req, res) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, '');

    // 路由映射表
    const routes = {
        'POST /upload': handleUpload,
        'POST /analyze': handleAnalyze,
        'GET /task': handleGetTask,
        'GET /tasks': handleListTasks,
        'GET /stats': handleStats,
        'GET /announcement': handleAnnouncement,
        'GET /config': handleGetConfig,
        'POST /config-update': handleUpdateConfig,
        'POST /auth': handleAuth,
        'GET /health': handleHealth,
    };

    const key = `${req.method} ${path}`;
    const handler = routes[key];

    if (handler) {
        return handler(req, res);
    }

    // 404
    return res.status(404).json(error('API endpoint not found', 404));
}
