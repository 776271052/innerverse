import { query } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
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
