import { redis } from './lib/redis.js';
import { REDIS_KEYS, TASK_STATUS } from './lib/constants.js';
import { analyzeWithAI } from './lib/ai-client.js';

export default async function handler(req, res) {
    // 验证 cron 请求（通过 Authorization 头或环境变量）
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const processedTasks = [];

    try {
        // 获取所有任务键
        const keys = await redis.keys(REDIS_KEYS.TASK + '*');
        
        for (const key of keys) {
            const task = await redis.hgetall(key);
            if (task.status === TASK_STATUS.PENDING) {
                // 标记为处理中，防止重复执行
                await redis.hset(key, { status: TASK_STATUS.PROCESSING });
                processedTasks.push(key);

                try {
                    const payload = JSON.parse(task.payload);
                    const result = await analyzeWithAI(task.type, payload);
                    
                    await redis.hset(key, {
                        status: TASK_STATUS.COMPLETED,
                        result,
                        completedAt: Date.now()
                    });
                    await redis.incr(REDIS_KEYS.STATS_SUCCESS);
                    
                } catch (err) {
                    console.error(`Task ${key} failed:`, err);
                    await redis.hset(key, {
                        status: TASK_STATUS.FAILED,
                        error: err.message,
                        failedAt: Date.now()
                    });
                    await redis.incr(REDIS_KEYS.STATS_FAILED);
                }
            }
        }

        res.status(200).json({ 
            processed: true, 
            tasksProcessed: processedTasks.length 
        });
    } catch (err) {
        console.error('Process task error:', err);
        res.status(500).json({ error: '处理失败: ' + err.message });
    }
}
