import { query } from './lib/db.js';

export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: '缺少id' });
    const r = await query(`SELECT * FROM tasks WHERE id = ?`, [id]);
    if (!r.results.length) return res.status(404).json({ error: '任务不存在' });
    res.json({ success: true, data: r.results[0] });
}
