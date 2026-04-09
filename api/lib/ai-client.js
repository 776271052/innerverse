import { getConfig } from './db.js';

export async function analyzeWithAI(type, images, selfDesc = '') {
    const provider = await getConfig('ai_provider', 'siliconflow');
    const prompts = {
        moment: '你是心理分析师，根据朋友圈截图推断MBTI...',
        chat: '你是沟通专家，分析对话风格...',
        htp: '你是绘画心理分析师，分析房树人...'
    };
    const messages = [
        { role: 'system', content: prompts[type] },
        { role: 'user', content: [
            { type: 'text', text: selfDesc ? `用户描述：${selfDesc}` : '请分析' },
            ...images.map(url => ({ type: 'image_url', image_url: { url } }))
        ]}
    ];

    if (provider === 'siliconflow') {
        const key = await getConfig('siliconflow_api_key');
        const model = type === 'htp' ? 'Qwen/Qwen3-VL-8B-Instruct' : 'Qwen/Qwen2.5-7B-Instruct';
        const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 1024 })
        });
        const data = await res.json();
        return data.choices[0].message.content;
    }
    // deepseek/cloudflare 类似，略...
    throw new Error('AI调用失败');
}
