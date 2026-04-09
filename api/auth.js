import { getConfig } from './lib/db.js';
export async function verifyAdmin(req) {
    const secret = req.headers['x-admin-secret'] || (req.body && req.body.secret);
    const adminSecret = await getConfig('admin_secret', 'admin123');
    return secret === adminSecret;
}
