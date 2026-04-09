import { getConfig } from './lib/db.js';
import { success } from './lib/responses.js';

export default async function handler(req, res) {
    const content = await getConfig('announcement', '');
    return res.json(success({ content }));
}
