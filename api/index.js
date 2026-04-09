import { uploadImage } from './lib/blob.js';
import { query, getConfig, setConfig, getAllConfigs } from './lib/db.js';
import { analyzeWithAI } from './lib/ai-client.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';
import { v4 as uuidv4 } from 'uuid';

function getQueryParams(req) {
    const host = req.headers.host || 'localhost';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const fullUrl = new URL(req.url, `${protocol}://${host}`);
    return fullUrl.searchParams;
}

async function handleUpload(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const limit = checkRateLimit(ip, 10, 60);
    if (!limit.allowed) return res.status(429).json(error(`请求频繁，${limit.resetIn}秒后重试`, 429));
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        if (!file) return res.status(400).json(error('未提供文件'));
        if (!file.type.startsWith('image/')) return res.status(400).json(error('仅支持图片'));
        if (file.size > 10 * 1024 * 1024) return res.status(400).json(error('图片不超过10MB'));
        const url = await uploadImage(file);
        return res.json(success({ url }));
    } catch (e) {
        console.error('Upload error:', e);
        return res.status(500).json(error('上传失败: ' + e.message));
    }
}

async function handleAnalyze(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const limit = checkRateLimit(ip, 5, 60);
    if (!limit.allowed) return res.status(429).json(error(`请求频繁，${limit.resetIn}秒后重试`, 429));
    try {
        const { type, images, selfDesc } = req.body;
        if (!type || !['moment', 'chat', 'htp'].includes(type)) return res.status(400).json(error('无效分析类型'));
        if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) return res.status(400).json(error('图片数量1-3张'));
        const taskId = uuidv4();
        const provider = await getConfig('ai_provider', 'siliconflow');
        const now = Math.floor(Date.now() / 1000);
        await query(`INSERT INTO tasks (id, type, status, provider, images, self_desc, created_at, updated_at) VALUES (?, ?, 'processing', ?, ?, ?, ?, ?)`, [taskId, type, provider, JSON.stringify(images), selfDesc || '', now, now]);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'total'`);
        const result = await analyzeWithAI(type, images, selfDesc);
        const completedAt = Math.floor(Date.now() / 1000);
        await query(`UPDATE tasks SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`, [result, completedAt, completedAt, taskId]);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'success'`);
        return res.json(success({ taskId, result }));
    } catch (e) {
        console.error('Analyze error:', e);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'failed'`);
        return res.status(500).json(error('分析失败: ' + e.message));
    }
}

async function handleGetTask(req, res) {
    const params = getQueryParams(req);
    const id = params.get('id');
    if (!id) return res.status(400).json(error('缺少任务ID'));
    const result = await query(`SELECT id, type, status, result, error, created_at FROM tasks WHERE id = ?`, [id]);
    if (!result.results?.length) return res.status(404).json(error('任务不存在'));
    return res.json(success(result.results[0]));
}

async function handleListTasks(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    const params = getQueryParams(req);
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || 20;
    const status = params.get('status') || '';
    const type = params.get('type') || '';
    const search = params.get('search') || '';
    const offset = (page - 1) * limit;
    let where = [], vals = [];
    if (status) { where.push('status = ?'); vals.push(status); }
    if (type) { where.push('type = ?'); vals.push(type); }
    if (search) { where.push('id LIKE ?'); vals.push(`%${search}%`); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) as total FROM tasks ${whereClause}`, vals);
    const total = countResult.results[0].total;
    const dataResult = await query(`SELECT id, type, status, provider, created_at FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...vals, limit, offset]);
    return res.json(success({ tasks: dataResult.results, total, page, limit }));
}

async function handleStats(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    const totalR = await query(`SELECT value FROM stats WHERE name = 'total'`);
    const successR = await query(`SELECT value FROM stats WHERE name = 'success'`);
    const failedR = await query(`SELECT value FROM stats WHERE name = 'failed'`);
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
    const dailyR = await query(`SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY day ORDER BY day`, [sevenDaysAgo]);
    const providerR = await query(`SELECT provider, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY provider`, [sevenDaysAgo]);
    return res.json(success({ total: totalR.results[0]?.value || 0, success: successR.results[0]?.value || 0, failed: failedR.results[0]?.value || 0, daily: dailyR.results, providers: providerR.results }));
}

async function handleAnnouncement(req, res) {
    const content = await getConfig('announcement', '');
    return res.json(success({ content }));
}

async function handleGetConfig(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    const configs = await getAllConfigs();
    return res.json(success(configs));
}

async function handleUpdateConfig(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    const { key, value } = req.body;
    if (!key) return res.status(400).json(error('缺少 key'));
    await setConfig(key, value);
    return res.json(success());
}

async function handleAuth(req, res) {
    const verified = await verifyAdmin(req);
    console.log('Auth attempt, result:', verified);
    if (verified) {
        return res.json(success({ authenticated: true }));
    }
    return res.status(401).json(error('密钥错误', 401));
}

async function handleHealth(req, res) {
    try {
        await query(`SELECT 1 FROM configs LIMIT 1`);
        res.json({ status: 'ok', timestamp: Date.now() });
    } catch (e) {
        res.status(500).json({ status: 'error', error: e.message });
    }
}

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
    'GET /health': handleHealth
};

export default async function handler(req, res) {
    const urlPath = req.url.split('?')[0];
    const path = urlPath.replace(/^\/api/, '');
    const key = `${req.method} ${path}`;
    const routeHandler = routes[key];
    if (routeHandler) return routeHandler(req, res);
    return res.status(404).json(error('API endpoint not found', 404));
}
