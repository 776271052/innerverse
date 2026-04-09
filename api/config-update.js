import { setConfig } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!verifyAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
    
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: '缺少 key' });
    
    try {
        await setConfig(key, value);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
