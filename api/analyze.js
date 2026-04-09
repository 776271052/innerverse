import { v4 as uuid } from 'uuid';
import { query, getConfig } from './lib/db.js';
import { analyzeWithAI } from './lib/ai-client.js';
import { checkRateLimit } from './lib/rate-limit.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(ip, 5, 60)) return res.status(429).json({ error: '请求过于频繁' });

    try {
        const { type, images, selfDesc } = req.body;
        const taskId = uuid();
        const provider = await getConfig('ai_provider', 'siliconflow');
        const now = Math.floor(Date.now() / 1000);
        await query(`INSERT INTO tasks (id, type, status, provider, images, self_desc, created_at, updated_at) VALUES (?, ?, 'processing', ?, ?, ?, ?, ?)`,
            [taskId, type, provider, JSON.stringify(images), selfDesc || '', now, now]);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'total'`);

        // 异步执行分析（Vercel 长函数直接等待）
        const result = await analyzeWithAI(type, images, selfDesc);
        await query(`UPDATE tasks SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
            [result, Math.floor(Date.now()/1000), Math.floor(Date.now()/1000), taskId]);
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'success'`);

        res.json({ success: true, data: { taskId, result } });
    } catch (e) {
        await query(`UPDATE stats SET value = value + 1 WHERE name = 'failed'`);
        res.status(500).json({ error: e.message });
    }
}
