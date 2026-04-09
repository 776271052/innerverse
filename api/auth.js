import { getConfig } from './lib/db.js';

export async function verifyAdmin(req) {
    const url = new URL(req.url);
    let secret = req.headers['x-admin-secret'] || url.searchParams.get('secret');
    if (!secret && req.method === 'POST') {
        try {
            const body = await req.json();
            secret = body.secret;
        } catch {}
    }
    const adminSecret = await getConfig('admin_secret', 'admin123');
    return secret === adminSecret;
}
