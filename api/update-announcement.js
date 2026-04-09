import { redis } from './lib/redis.js';
import { REDIS_KEYS } from './lib/constants.js';
import { error, success } from './lib/response.js';
import { isAdminAllowed } from './lib/admin-guard.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        if (!isAdminAllowed(req)) {
            throw error('IP 地址未被授权', 403);
        }

        const { secret, content } = req.body;
        if (secret !== process.env.ADMIN_SECRET) {
            throw error('管理员密钥错误', 401);
        }

        await redis.set(REDIS_KEYS.ANNOUNCEMENT, content || '');
        res.status(200).json(success(null, '公告已更新'));
    } catch (err) {
        console.error('Update announcement error:', err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
}
