import { getAllConfigs } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';

export default async function handler(req, res) {
    if (!verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const configs = await getAllConfigs();
        res.json({ success: true, data: configs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
