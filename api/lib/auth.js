import { getConfig } from './db.js';

/**
 * 验证管理员密钥
 * @param {Request} request - HTTP 请求对象
 * @returns {Promise<boolean>} 验证通过返回 true，否则返回 false
 */
export async function verifyAdmin(request) {
    try {
        let secret = null;

        // 1. 优先从请求头 X-Admin-Secret 获取
        secret = request.headers.get('x-admin-secret');

        // 2. 如果是 POST 请求，尝试从请求体中读取
        if (!secret && request.method === 'POST') {
            try {
                // 克隆请求体以避免消耗原始流
                const clonedRequest = request.clone();
                const body = await clonedRequest.json().catch(() => ({}));
                secret = body.secret;
            } catch {
                // 忽略解析错误，secret 保持 null
            }
        }

        // 3. 最后尝试从 URL 查询参数获取
        if (!secret) {
            const url = new URL(request.url);
            secret = url.searchParams.get('secret');
        }

        // 如果没有提供任何密钥，直接返回 false
        if (!secret) {
            return false;
        }

        // 从数据库获取管理员密码，默认为 'admin123'
        const adminSecret = await getConfig('admin_secret', 'admin123');
        
        // 比对密钥
        return secret === adminSecret;
    } catch (error) {
        // 记录错误日志，便于排查
        console.error('verifyAdmin error:', error);
        return false;
    }
}
