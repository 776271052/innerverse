// functions/api/submit-task.ts
import { Env, TaskType } from '../lib/types';
import { error, success } from '../lib/responses';
import { checkRateLimit } from '../lib/rate-limit';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    
    // 限流：每分钟5次提交
    if (!await checkRateLimit(request, env, 5, 60)) {
        return error('请求过于频繁，请稍后再试', 429);
    }
    
    let body: any;
    try {
        body = await request.json();
    } catch {
        return error('无效的 JSON 请求体', 400);
    }
    
    const { type, imageKeys } = body;
    if (!type || !['moment', 'chat', 'htp'].includes(type)) {
        return error('无效的分析类型', 400);
    }
    if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
        return error('至少需要一张图片', 400);
    }
    if (imageKeys.length > 3) {
        return error('最多上传3张图片', 400);
    }
    
    const taskId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    try {
        // 插入任务
        const stmt = env.DB.prepare(`
            INSERT INTO tasks (id, type, status, images, image_key, created_at, updated_at)
            VALUES (?, ?, 'pending', ?, ?, ?, ?)
        `).bind(
            taskId,
            type,
            type !== 'htp' ? JSON.stringify(imageKeys) : null,
            type === 'htp' ? imageKeys[0] : null,
            now,
            now
        );
        await stmt.run();
        
        // 发送队列消息
        await env.AI_TASK_QUEUE.send({ taskId });
        
        // 更新统计
        await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE name = 'total'`).run();
        
        return success({ taskId }, '任务已提交');
    } catch (e) {
        console.error('Submit error:', e);
        return error('提交失败', 500);
    }
};
