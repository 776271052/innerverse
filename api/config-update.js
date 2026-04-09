import { setConfig } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json(error('Method not allowed', 405));
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));

    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json(error('缺少 key'));
        await setConfig(key, value);
        return res.json(success());
    } catch (e) {
        return res.status(500).json(error('更新失败'));
    }
}
