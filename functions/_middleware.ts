// functions/_middleware.ts
import { Env } from './lib/types';

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, next } = context;
    const response = await next();
    
    // 添加 CORS 头
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }
    
    return new Response(response.body, { ...response, headers });
};
