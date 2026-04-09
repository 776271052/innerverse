export async function query(sql, params = []) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.errors[0].message);
    return data.result[0];
}

export async function getConfig(key, defaultValue = '') {
    try {
        const result = await query(`SELECT value FROM configs WHERE key = ?`, [key]);
        return result.results.length > 0 ? result.results[0].value : defaultValue;
    } catch {
        return defaultValue;
    }
}

export async function setConfig(key, value) {
    const now = Math.floor(Date.now() / 1000);
    await query(`
        INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `, [key, value, now]);
}

export async function getAllConfigs() {
    const result = await query(`SELECT key, value, description FROM configs`);
    return result.results;
}
