import { redis } from './lib/redis.js';
import { REDIS_KEYS } from './lib/constants.js';

export default async function handler(req, res) {
    try {
        const text = await redis.get(REDIS_KEYS.ANNOUNCEMENT) || '';
        res.status(200).json({ text });
    } catch (err) {
        console.error('Get announcement error:', err);
        res.status(500).json({ error: '获取公告失败' });
    }
}
