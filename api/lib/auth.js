import { getConfig } from './db.js';

export async function verifyAdmin(request) {
    try {
        let secret = null;
        secret = request.headers.get('x-admin-secret');
        if (!secret && request.method === 'POST') {
            try {
                const body = await request.clone().json();
                secret = body.secret;
            } catch {}
        }
        if (!secret) {
            const url = new URL(request.url);
            secret = url.searchParams.get('secret');
        }
        console.log('[verifyAdmin] Provided secret:', secret ? '***' : 'empty');
        if (!secret) return false;

        const adminSecret = await getConfig('admin_secret', 'admin123');
        console.log('[verifyAdmin] DB secret exists:', !!adminSecret);
        return secret === adminSecret;
    } catch (error) {
        console.error('[verifyAdmin] Error:', error.message);
        return false;
    }
}
