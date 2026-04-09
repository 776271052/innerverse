import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json(error('Method not allowed', 405));
    if (await verifyAdmin(req)) {
        return res.json(success({ authenticated: true }));
    }
    return res.status(401).json(error('密钥错误', 401));
}
