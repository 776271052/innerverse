/**
 * Vercel Serverless Function - AI 分析代理 (SiliconFlow 专用)
 * 环境变量：
 *   SILICONFLOW_API_KEY: 必需
 *   AI_VISION_MODEL: 可选，房树人使用，默认 Qwen/Qwen3-VL-8B-Instruct
 *   AI_TEXT_MODEL: 可选，文本使用，默认 Qwen/Qwen2.5-7B-Instruct
 */

exports.default = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { type, images, selfDesc } = req.body;

        // 参数校验
        if (!type || !['moment', 'chat', 'htp'].includes(type)) {
            return res.status(400).json({ success: false, error: '无效分析类型' });
        }
        if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
            return res.status(400).json({ success: false, error: '图片数量1-3张' });
        }

        // 读取 API Key
        const apiKey = process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: '未配置 SILICONFLOW_API_KEY。请在 Vercel 项目设置中添加该环境变量。'
            });
        }

        // 模型选择
        let model;
        if (type === 'htp') {
            model = process.env.AI_VISION_MODEL || 'Qwen/Qwen3-VL-8B-Instruct';
        } else {
            model = process.env.AI_TEXT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
        }

        const prompts = {
            moment: "你是一位资深心理分析师。请根据朋友圈截图推断MBTI类型，输出格式：1. MBTI类型 2. 各维度评分(E/I,S/N,T/F,J/P) 3. 详细分析(300字) 4. 建议。",
            chat: "你是沟通心理学专家。分析聊天截图：1. 沟通风格 2. 关系推测 3. 情绪特点 4. 改善建议。约300字。",
            htp: "你是房树人绘画分析师。从整体、房子、树木、人物分析心理状态，给出评估与建议。约400字。"
        };

        const systemPrompt = prompts[type];
        const userContent = [
            { type: 'text', text: selfDesc ? `用户描述：${selfDesc}` : '请开始分析。' },
            ...images.map(url => ({ type: 'image_url', image_url: { url } }))
        ];
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];

        const requestBody = {
            model,
            messages,
            temperature: 0.7,
            max_tokens: 1024
        };

        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorDetail = data.error?.message || data.message || JSON.stringify(data);
            console.error('SiliconFlow API error:', response.status, errorDetail);
            return res.status(response.status).json({
                success: false,
                error: `SiliconFlow 返回错误 (${response.status}): ${errorDetail}`
            });
        }

        const result = data.choices[0].message.content;

        return res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Analyze error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || '未知服务器错误'
        });
    }
};
