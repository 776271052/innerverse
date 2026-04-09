const ipMap = new Map();

export function checkRateLimit(ip, limit = 10, windowSec = 60) {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const record = ipMap.get(ip) || { timestamps: [] };

    record.timestamps = record.timestamps.filter(t => now - t < windowMs);

    if (record.timestamps.length >= limit) {
        const oldest = record.timestamps[0];
        const resetIn = Math.ceil((oldest + windowMs - now) / 1000);
        return { allowed: false, resetIn };
    }

    record.timestamps.push(now);
    ipMap.set(ip, record);
    return { allowed: true };
}
