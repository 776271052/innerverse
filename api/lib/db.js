const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const D1_ID = process.env.D1_DATABASE_ID;
const BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_ID}`;

async function d1Request(sql, params = [], retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(`${BASE}/query`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql, params })
            });
            const data = await res.json();
            if (!data.success) {
                console.error('[D1] Query failed:', data.errors);
                throw new Error(data.errors?.[0]?.message || 'D1 query failed');
            }
            return data.result[0];
        } catch (e) {
            console.error(`[D1] Attempt ${i + 1} failed:`, e.message);
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 200 * (i + 1)));
        }
    }
}

export async function query(sql, params = []) {
    return d1Request(sql, params);
}

export async function getConfig(key, defaultValue = '') {
    try {
        const result = await query(`SELECT value FROM configs WHERE key = ?`, [key]);
        const value = result.results?.length ? result.results[0].value : defaultValue;
        console.log(`[getConfig] ${key} = ${value ? '***' : 'empty'}`);
        return value;
    } catch (error) {
        console.error(`[getConfig] Error for ${key}:`, error.message);
        return defaultValue;
    }
}

export async function setConfig(key, value) {
    const now = Math.floor(Date.now() / 1000);
    await query(`INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, value, now]);
}

export async function getAllConfigs() {
    const result = await query(`SELECT key, value FROM configs`);
    return result.results;
}
