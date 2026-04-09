// functions/api/upload-image.ts
import { Env } from '../lib/types';
import { error, success } from '../lib/responses';
import { checkRateLimit } from '../lib/rate-limit';

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    
    // 限流：每分钟最多10次上传
    if (!await checkRateLimit(request, env, 10, 60)) {
        return error('请求过于频繁，请稍后再试', 429);
    }
    
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
        return error('无效的请求格式', 400);
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) return error('未提供文件', 400);
    if (!file.type.startsWith('image/')) return error('文件类型必须是图片', 400);
    if (file.size > 5 * 1024 * 1024) return error('文件大小不能超过 5MB', 400);
    
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}.jpg`;
    try {
        await env.IMAGE_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });
        return success({ key });
    } catch (e) {
        console.error('Upload error:', e);
        return error('上传失败', 500);
    }
};
