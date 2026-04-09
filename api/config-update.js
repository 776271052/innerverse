import { setConfig } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
export default async (req, res) => {
    if (!await verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    const { key, value } = req.body;
    await setConfig(key, value);
    res.json({ success: true });
};
