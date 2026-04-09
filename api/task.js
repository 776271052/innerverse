import { query } from './lib/db.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).json(error('缺少任务ID'));

    try {
        const r = await query(`SELECT id, type, status, result, error, created_at FROM tasks WHERE id = ?`, [id]);
        if (!r.results?.length) return res.status(404).json(error('任务不存在'));
        return res.json(success(r.results[0]));
    } catch (e) {
        return res.status(500).json(error('查询失败'));
    }
}
