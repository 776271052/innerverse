import { getConfig } from './db.js';

const PROMPTS = {
    moment: `你是一位资深心理分析师。请根据朋友圈截图推断MBTI类型，输出格式：1. MBTI类型 2. 各维度评分(E/I,S/N,T/F,J/P) 3. 详细分析(300字) 4. 建议。`,
    chat: `你是沟通心理学专家。分析聊天截图：1. 沟通风格 2. 关系推测 3. 情绪特点 4. 改善建议。约300字。`,
    htp: `你是房树人绘画分析师。从整体、房子、树木、人物分析心理状态，给出评估与建议。约400字。`
};

const MODELS = {
    siliconflow: { vision: 'Qwen/Qwen3-VL-8B-Instruct', text: 'Qwen/Qwen2.5-7B-Instruct' },
    deepseek: { vision: 'deepseek-chat', text: 'deepseek-chat' },
    cloudflare: { vision: '@cf/qwen/qwen2.5-vl-7b-instruct', text: '@cf/meta/llama-3.2-11b-vision-instruct' }
};

async function fetchWithTimeout(url, options, timeout = 280000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return res;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

async function callSiliconFlow(apiKey, model, messages) {
    const res = await fetchWithTimeout('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
    });
    if (!res.ok) throw new Error(`SiliconFlow error ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callDeepSeek(apiKey, messages) {
    const res = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: 1024 })
    });
    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callCloudflareAI(accountId, token, model, messages) {
    const res = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
    });
    if (!res.ok) throw new Error(`Cloudflare AI error ${res.status}`);
    const data = await res.json();
    return data.result.response;
}

export async function analyzeWithAI(type, imageUrls, selfDesc = '') {
    const provider = await getConfig('ai_provider', 'siliconflow');
    const modelKey = type === 'htp' ? 'vision' : 'text';
    const model = MODELS[provider]?.[modelKey];
    if (!model) throw new Error(`Unknown provider/model: ${provider}/${modelKey}`);
    
    const systemPrompt = PROMPTS[type];
    const userContent = [
        { type: 'text', text: selfDesc ? `用户描述：${selfDesc}` : '请开始分析。' },
        ...imageUrls.map(url => ({ type: 'image_url', image_url: { url } }))
    ];
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
    ];

    if (provider === 'siliconflow') {
        const apiKey = await getConfig('siliconflow_api_key');
        if (!apiKey) throw new Error('未配置 SiliconFlow API Key');
        return await callSiliconFlow(apiKey, model, messages);
    } else if (provider === 'deepseek') {
        const apiKey = await getConfig('deepseek_api_key');
        if (!apiKey) throw new Error('未配置 DeepSeek API Key');
        return await callDeepSeek(apiKey, messages);
    } else if (provider === 'cloudflare') {
        const accountId = await getConfig('cloudflare_account_id');
        const token = await getConfig('cloudflare_api_token');
        if (!accountId || !token) throw new Error('未配置 Cloudflare AI 凭证');
        return await callCloudflareAI(accountId, token, model, messages);
    }
    throw new Error('AI 服务商配置错误');
}
