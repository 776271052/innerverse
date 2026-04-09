// workers/queue-consumer/src/index.ts
import { Env, Task } from '../../../functions/lib/types';
import { analyzeWithAI } from './ai-client';

export default {
    async queue(batch: MessageBatch<{ taskId: string }>, env: Env): Promise<void> {
        for (const message of batch.messages) {
            const { taskId } = message.body;
            console.log(`[Queue] Processing task ${taskId}`);

            const now = Math.floor(Date.now() / 1000);
            
            // 更新状态为 processing
            await env.DB.prepare(`UPDATE tasks SET status = 'processing', updated_at = ? WHERE id = ?`)
                .bind(now, taskId).run();

            try {
                // 获取任务详情
                const task = await env.DB.prepare(`SELECT * FROM tasks WHERE id = ?`)
                    .bind(taskId).first<Task>();
                if (!task) throw new Error('Task not found');

                // 从 R2 读取图片并转为 base64
                const imagesBase64: string[] = [];
                const keysToFetch: string[] = task.type !== 'htp' 
                    ? JSON.parse(task.images || '[]') 
                    : [task.image_key!];

                for (const key of keysToFetch) {
                    const obj = await env.IMAGE_BUCKET.get(key);
                    if (!obj) continue;
                    const buffer = await obj.arrayBuffer();
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                    imagesBase64.push(`data:${obj.httpMetadata?.contentType || 'image/jpeg'};base64,${base64}`);
                }

                if (imagesBase64.length === 0) {
                    throw new Error('No images found in R2');
                }

                // 调用 AI 分析
                const result = await analyzeWithAI(env, task.type, imagesBase64);

                // 更新为 completed
                await env.DB.prepare(`UPDATE tasks SET status = 'completed', result = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
                    .bind(result, now, now, taskId).run();

                await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE name = 'success'`).run();

                message.ack();
            } catch (err: any) {
                console.error(`[Queue] Task ${taskId} failed:`, err);
                const errorMsg = err.message || 'Unknown error';
                await env.DB.prepare(`UPDATE tasks SET status = 'failed', error = ?, updated_at = ? WHERE id = ?`)
                    .bind(errorMsg, now, taskId).run();
                await env.DB.prepare(`UPDATE stats SET value = value + 1 WHERE name = 'failed'`).run();
                message.retry({ delaySeconds: 60 });
            }
        }
    },
};
