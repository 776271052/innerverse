import { getConfig } from './lib/db.js';
export default async (req, res) => {
    const content = await getConfig('announcement', '');
    res.json({ success: true, data: { content } });
};
