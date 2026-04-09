import { uploadImage } from './lib/blob.js';
import { checkRateLimit } from './lib/rate-limit.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    if (!checkRateLimit(ip, 10, 60)) return res.status(429).json({ error: '请求过于频繁' });

    try {
        const form = await req.formData();
        const file = form.get('file');
        if (!file) return res.status(400).json({ error: '未提供文件' });
        const url = await uploadImage(file);
        res.json({ success: true, data: { url } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
