import { query } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
export default async (req, res) => {
    if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const r = await query(`SELECT key, value FROM configs`);
    res.json({ success: true, data: r.results });
};
