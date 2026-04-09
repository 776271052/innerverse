import { v4 as uuidv4 } from 'uuid';
import { redis } from './lib/redis.js';
import { REDIS_KEYS, TASK_STATUS, MAX_IMAGE_SIZE } from './lib/constants.js';
import { rateLimit } from './lib/rate-limit.js';
import { error, success } from './lib/response.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        await rateLimit(req, 5, 60); // 每分钟5次提交
        const { type, images, image } = req.body;

        // 校验图片大小
        const validateBase64Size = (base64) => {
            const base64Data = base64.split(',')[1] || base64;
            const sizeInBytes = (base64Data.length * 3) / 4;
            if (sizeInBytes > MAX_IMAGE_SIZE) {
                throw error(`单张图片超过 ${MAX_IMAGE_SIZE / 1024 / 1024}MB 限制`);
            }
        };

        if (type === 'moment' || type === 'chat') {
            if (!images || !Array.isArray(images) || images.length === 0) {
                throw error('请至少上传一张图片');
            }
            if (images.length > 5) {
                throw error('最多上传5张图片');
            }
            images.forEach(validateBase64Size);
        } else if (type === 'htp') {
            if (!image) throw error('请提供绘画图片');
            validateBase64Size(image);
        } else {
            throw error('不支持的分析类型');
        }

        const taskId = uuidv4();
        const taskKey = REDIS_KEYS.TASK + taskId;
        await redis.hset(taskKey, {
            type,
            status: TASK_STATUS.PENDING,
            createdAt: Date.now(),
            payload: JSON.stringify({ images, image })
        });
        await redis.expire(taskKey, 3600); // 1小时过期
        await redis.incr(REDIS_KEYS.STATS_TOTAL);

        res.status(200).json(success({ taskId }, '任务已提交'));
    } catch (err) {
        console.error('Submit task error:', err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
}
