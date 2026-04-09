import { v4 as uuidv4 } from 'uuid';
import { query, getConfig } from './lib/db.js';
import { analyzeWithAI } from './lib/ai-client.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json(error('Method not allowed', 405));

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

        // 异步分析（利用 Vercel 300s 长函数直接等待）
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
