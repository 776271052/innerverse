// functions/lib/rate-limit.ts
import { Env } from './types';

// 简单的内存限流（跨请求不共享，但每个 Worker 实例独立，对小型项目足够）
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(request: Request, env: Env, limit: number = 10, windowSec: number = 60): Promise<boolean> {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const record = ipRequestCounts.get(ip);
    
    if (!record || now > record.resetTime) {
        ipRequestCounts.set(ip, { count: 1, resetTime: now + windowSec * 1000 });
        return true;
    }
    
    if (record.count >= limit) {
        return false;
    }
    
    record.count++;
    return true;
}
