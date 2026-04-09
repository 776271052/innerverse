import { uploadImage } from './lib/blob.js';
import { checkRateLimit } from './lib/rate-limit.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json(error('Method not allowed', 405));
    
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const limit = checkRateLimit(ip, 10, 60);
    if (!limit.allowed) return res.status(429).json(error(`请求频繁，${limit.resetIn}秒后重试`, 429));

    try {
        const form = await req.formData();
        const file = form.get('file');
        if (!file) return res.status(400).json(error('未提供文件'));
        if (!file.type.startsWith('image/')) return res.status(400).json(error('仅支持图片'));
        if (file.size > 10 * 1024 * 1024) return res.status(400).json(error('图片不超过10MB'));

        const url = await uploadImage(file);
        return res.json(success({ url }));
    } catch (e) {
        console.error('Upload error:', e);
        return res.status(500).json(error('上传失败'));
    }
}
