// functions/api/update-announcement.ts
import { Env } from '../lib/types';
import { error, success } from '../lib/responses';
import { verifyAdmin } from '../lib/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    
    let body: any;
    try {
        body = await request.json();
    } catch {
        return error('无效的 JSON 请求体', 400);
    }
    
    const { secret, content } = body;
    if (!verifyAdmin(request, env) && secret !== env.ADMIN_SECRET) {
        return error('管理员密钥错误', 401);
    }
    
    try {
        const now = Math.floor(Date.now() / 1000);
        // 简单实现：更新单条记录，保证只有一条
        await env.DB.prepare(`DELETE FROM announcements`).run();
        await env.DB.prepare(`INSERT INTO announcements (content, updated_at) VALUES (?, ?)`)
            .bind(content || '', now).run();
        return success(null, '公告已更新');
    } catch (e) {
        console.error('Update announcement error:', e);
        return error('更新失败', 500);
    }
};
