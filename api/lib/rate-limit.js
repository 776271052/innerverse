import { redis } from './redis.js';

export async function rateLimit(req, limit = 10, windowSec = 60) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const key = `rate:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, windowSec);
    }
    if (current > limit) {
        const ttl = await redis.ttl(key);
        throw new Error(`请求过于频繁，请在 ${ttl} 秒后重试`);
    }
    return true;
}
