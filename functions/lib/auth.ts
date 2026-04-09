// functions/lib/auth.ts
import { Env } from './types';
import { error } from './responses';

export function verifyAdmin(request: Request, env: Env): boolean {
    const url = new URL(request.url);
    const secret = request.method === 'POST' 
        ? (request as any).secret  // 将在具体处理中提取
        : url.searchParams.get('secret');
    return secret === env.ADMIN_SECRET;
}
