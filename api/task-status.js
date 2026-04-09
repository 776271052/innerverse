import { redis } from './lib/redis.js';
import { REDIS_KEYS } from './lib/constants.js';
import { success } from './lib/response.js';

export default async function handler(req, res) {
    const { taskId } = req.query;
    if (!taskId) {
        return res.status(400).json({ error: '缺少 taskId' });
    }
    try {
        const taskKey = REDIS_KEYS.TASK + taskId;
        const task = await redis.hgetall(taskKey);
        if (!task || Object.keys(task).length === 0) {
            return res.status(404).json({ error: '任务不存在或已过期' });
        }
        res.status(200).json({
            status: task.status,
            result: task.result || null,
            error: task.error || null,
            createdAt: task.createdAt
        });
    } catch (err) {
        console.error('Get task status error:', err);
        res.status(500).json({ error: '查询失败' });
    }
}
