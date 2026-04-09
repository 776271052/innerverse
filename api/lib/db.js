const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const D1_ID = process.env.D1_DATABASE_ID;
const BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/d1/database/${D1_ID}`;

export async function query(sql, params = []) {
    const res = await fetch(`${BASE}/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.errors[0].message);
    return data.result[0];
}

export async function getConfig(key, def = '') {
    try {
        const r = await query(`SELECT value FROM configs WHERE key = ?`, [key]);
        return r.results.length ? r.results[0].value : def;
    } catch { return def; }
}

export async function setConfig(key, value) {
    const now = Math.floor(Date.now() / 1000);
    await query(`INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`, [key, value, now]);
}
