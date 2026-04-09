// functions/api/task-status.ts
import { Env } from '../lib/types';
import { error, success } from '../lib/responses';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) return error('缺少 taskId', 400);
    
    try {
        const stmt = env.DB.prepare(`SELECT * FROM tasks WHERE id = ?`).bind(taskId);
        const task = await stmt.first();
        if (!task) return error('任务不存在', 404);
        return success(task);
    } catch (e) {
        console.error('Status error:', e);
        return error('查询失败', 500);
    }
};
