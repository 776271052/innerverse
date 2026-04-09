// functions/api/announcement.ts
import { Env } from '../lib/types';
import { success, error } from '../lib/responses';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { env } = context;
    try {
        const stmt = env.DB.prepare(`SELECT content FROM announcements ORDER BY id DESC LIMIT 1`);
        const row = await stmt.first<{ content: string }>();
        return success({ content: row?.content || '' });
    } catch (e) {
        console.error('Announcement error:', e);
        return error('获取公告失败', 500);
    }
};
