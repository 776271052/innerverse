export function isAdminAllowed(req) {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
    const allowedIps = (process.env.ADMIN_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowedIps.length === 0) return true; // 未配置则允许所有
    return allowedIps.includes(clientIp);
}
