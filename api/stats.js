import { query } from './lib/db.js';
import { verifyAdmin } from './lib/auth.js';
import { error, success } from './lib/responses.js';

export default async function handler(req, res) {
    if (!await verifyAdmin(req)) return res.status(401).json(error('Unauthorized', 401));

    try {
        const totalR = await query(`SELECT value FROM stats WHERE name = 'total'`);
        const successR = await query(`SELECT value FROM stats WHERE name = 'success'`);
        const failedR = await query(`SELECT value FROM stats WHERE name = 'failed'`);
        
        const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
        const dailyR = await query(
            `SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY day ORDER BY day`,
            [sevenDaysAgo]
        );
        const providerR = await query(
            `SELECT provider, COUNT(*) as count FROM tasks WHERE created_at >= ? GROUP BY provider`,
            [sevenDaysAgo]
        );

        return res.json(success({
            total: totalR.results[0]?.value || 0,
            success: successR.results[0]?.value || 0,
            failed: failedR.results[0]?.value || 0,
            daily: dailyR.results,
            providers: providerR.results
        }));
    } catch (e) {
        return res.status(500).json(error('统计失败'));
    }
}
