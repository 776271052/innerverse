const map = new Map();
export function checkRateLimit(ip, limit, windowSec) {
    const now = Date.now();
    const rec = map.get(ip) || { count: 0, reset: now + windowSec*1000 };
    if (now > rec.reset) { rec.count = 1; rec.reset = now + windowSec*1000; }
    else rec.count++;
    map.set(ip, rec);
    return rec.count <= limit;
}
