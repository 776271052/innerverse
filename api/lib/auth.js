import { getConfig } from './db.js';

export async function verifyAdmin(request) {
    try {
        let secret = request.headers.get('x-admin-secret');
        if (!secret && request.method === 'POST') {
            // 注意：request.json() 只能调用一次，使用 clone 避免影响后续处理
            const body = await request.clone().json().catch(() => ({}));
            secret = body.secret;
        }
        if (!secret) {
            const url = new URL(request.url);
            secret = url.searchParams.get('secret');
        }
        const adminSecret = await getConfig('admin_secret', 'admin123');
        return secret === adminSecret;
    } catch (error) {
        console.error('verifyAdmin error:', error);
        return false;
    }
}
