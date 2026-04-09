/**
 * Vercel Serverless Function - AI 分析代理
 * 从 .env 文件读取配置，安全调用 SiliconFlow / DeepSeek / Cloudflare AI
 */

// 本地开发时加载 .env
if (process.env.NODE_ENV !== 'production') {
    try {
        const dotenv = await import('dotenv');
        dotenv.config();
    } catch (e) {
        console.warn('dotenv not available, skipping .env load');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { type, images, selfDesc } = req.body;

        if (!type || !['moment', 'chat', 'htp'].includes(type)) {
            return res.status(400).json({ success: false, error: '无效分析类型' });
        }
        if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
            return res.status(400).json({ success: false, error: '图片数量1-3张' });
        }

        const provider = process.env.AI_PROVIDER || 'siliconflow';
        const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
        if (!apiKey) {
            return res.status(500).json({ success: false, error: `未配置 ${provider} API Key` });
        }

        const prompts = {
            moment: "你是一位资深心理分析师。请根据朋友圈截图推断MBTI类型，输出格式：1. MBTI类型 2. 各维度评分(E/I,S/N,T/F,J/P) 3. 详细分析(300字) 4. 建议。",
            chat: "你是沟通心理学专家。分析聊天截图：1. 沟通风格 2. 关系推测 3. 情绪特点 4. 改善建议。约300字。",
            htp: "你是房树人绘画分析师。从整体、房子、树木、人物分析心理状态，给出评估与建议。约400字。"
        };

        const model = provider === 'siliconflow'
            ? (type === 'htp' ? 'Qwen/Qwen3-VL-8B-Instruct' : 'Qwen/Qwen2.5-7B-Instruct')
            : (provider === 'deepseek' ? 'deepseek-chat' : '@cf/meta/llama-3.2-11b-vision-instruct');

        const systemPrompt = prompts[type];
        const userContent = [
            { type: 'text', text: selfDesc ? `用户描述：${selfDesc}` : '请开始分析。' },
            ...images.map(url => ({ type: 'image_url', image_url: { url } }))
        ];
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];

        let endpoint, requestBody;
        if (provider === 'siliconflow') {
            endpoint = 'https://api.siliconflow.cn/v1/chat/completions';
            requestBody = { model, messages, temperature: 0.7, max_tokens: 1024 };
        } else if (provider === 'deepseek') {
            endpoint = 'https://api.deepseek.com/v1/chat/completions';
            requestBody = { model: 'deepseek-chat', messages, temperature: 0.7, max_tokens: 1024 };
        } else {
            endpoint = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;
            requestBody = { messages };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'AI 调用失败');
        }

        const result = provider === 'cloudflare'
            ? data.result.response
            : data.choices[0].message.content;

        return res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Analyze error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
