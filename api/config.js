import { getAllConfigs } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));
    try {
        const configs = await getAllConfigs();
        return res.json(success(configs));
    } catch (e) {
        return res.status(500).json(error('获取配置失败'));
    }
}
