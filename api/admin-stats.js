import { redis } from './lib/redis.js';
import { REDIS_KEYS } from './lib/constants.js';
import { error, success } from './lib/response.js';
import { isAdminAllowed } from './lib/admin-guard.js';

export default async function handler(req, res) {
    try {
        if (!isAdminAllowed(req)) {
            throw error('IP 地址未被授权', 403);
        }

        const { secret } = req.query;
        if (secret !== process.env.ADMIN_SECRET) {
            throw error('管理员密钥错误', 401);
        }

        const total = await redis.get(REDIS_KEYS.STATS_TOTAL) || 0;
        const successCount = await redis.get(REDIS_KEYS.STATS_SUCCESS) || 0;
        const failedCount = await redis.get(REDIS_KEYS.STATS_FAILED) || 0;

        res.status(200).json({
            totalTasks: parseInt(total),
            successTasks: parseInt(successCount),
            failedTasks: parseInt(failedCount)
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
}
