import { getConfig } from './db.js';

const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';

export async function analyzeWithAI(type, imagesBase64, selfDesc = '') {
    const provider = await getConfig('ai_provider', 'siliconflow');
    
    const prompts = {
        moment: `...`, // 完整提示词
        chat: `...`,
        htp: `...`
    };
    const systemPrompt = prompts[type];
    const userContent = [
        { type: 'text', text: `请分析。${selfDesc ? '用户补充描述：' + selfDesc : ''}` },
        ...imagesBase64.map(url => ({ type: 'image_url', image_url: { url } }))
    ];
    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }];

    if (provider === 'siliconflow') {
        const apiKey = await getConfig('siliconflow_api_key');
        if (!apiKey) throw new Error('未配置 SiliconFlow API Key');
        const model = type === 'htp' ? 'Qwen/Qwen3-VL-8B-Instruct' : 'Qwen/Qwen2.5-7B-Instruct';
        return await callSiliconFlow(apiKey, model, messages);
    } else if (provider === 'deepseek') {
        const apiKey = await getConfig('deepseek_api_key');
        if (!apiKey) throw new Error('未配置 DeepSeek API Key');
        return await callDeepSeek(apiKey, messages);
    } else if (provider === 'cloudflare') {
        const accountId = await getConfig('cloudflare_account_id');
        const apiToken = await getConfig('cloudflare_api_token');
        return await callCloudflareAI(accountId, apiToken, messages);
    }
    throw new Error('未知的 AI 服务商');
}

async function callSiliconFlow(apiKey, model, messages) { /* ... */ }
async function callDeepSeek(apiKey, messages) { /* ... */ }
async function callCloudflareAI(accountId, apiToken, messages) { /* ... */ }
