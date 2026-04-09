// functions/api/admin-stats.ts
import { Env } from '../lib/types';
import { error, success } from '../lib/responses';
import { verifyAdmin } from '../lib/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== env.ADMIN_SECRET) {
        return error('管理员密钥错误', 401);
    }
    
    try {
        const total = await env.DB.prepare(`SELECT value FROM stats WHERE name = 'total'`).first<{value: number}>();
        const successCount = await env.DB.prepare(`SELECT value FROM stats WHERE name = 'success'`).first<{value: number}>();
        const failed = await env.DB.prepare(`SELECT value FROM stats WHERE name = 'failed'`).first<{value: number}>();
        return success({
            total: total?.value || 0,
            success: successCount?.value || 0,
            failed: failed?.value || 0
        });
    } catch (e) {
        console.error('Stats error:', e);
        return error('获取统计失败', 500);
    }
};
