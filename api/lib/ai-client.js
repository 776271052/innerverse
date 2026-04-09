// AI 调用封装，支持 SiliconFlow 和 DeepSeek
// 可根据需要切换模型

const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';

// 朋友圈分析 Prompt
const MOMENT_PROMPT = `你是一位资深心理分析师，擅长通过朋友圈内容分析用户性格。
请根据用户提供的朋友圈截图内容，输出一份详细的 MBTI 性格分析报告。
格式要求：
1. 推断最可能的 MBTI 类型（如 INFJ、ESTP 等）
2. 各维度倾向性评分（0-100分）：E/I、S/N、T/F、J/P
3. 详细分析（约300字）：从内容中解读用户的兴趣、价值观、社交风格
4. 给出生活建议

请直接输出分析报告，不要输出其他无关内容。`;

// 聊天分析 Prompt
const CHAT_PROMPT = `你是一位沟通心理学专家，擅长分析对话中的沟通风格和关系模式。
请根据用户提供的聊天记录截图，分析以下内容：
1. 整体沟通风格（如：直接/委婉、理性/感性、主动/被动等）
2. 双方关系推测（如：亲密程度、权力关系）
3. 情绪表达特点
4. 改进沟通的建议

请输出一份结构清晰的分析报告，约300-400字。`;

// 房树人分析 Prompt
const HTP_PROMPT = `你是一位专业的绘画心理分析师，精通房树人（HTP）投射测验。
请根据用户提供的绘画作品（包含房子、树、人），从以下维度进行分析：
1. 整体印象与构图特点
2. 房子分析（象征家庭、安全感）
3. 树木分析（象征自我成长、生命力）
4. 人物分析（象征自我认知、人际关系）
5. 综合心理状态评估与建议

请输出专业且富有同理心的分析报告，约400字。`;

async function callSiliconFlow(messages, apiKey) {
    const res = await fetch(SILICONFLOW_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SiliconFlow API 错误: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callDeepSeek(messages, apiKey) {
    const res = await fetch(DEEPSEEK_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            temperature: 0.7,
            max_tokens: 1024
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek API 错误: ${res.status} ${errText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

/**
 * 统一的 AI 分析入口
 * @param {string} type - 'moment' | 'chat' | 'htp'
 * @param {object} payload - 包含 images (数组) 或 image (单张 base64)
 * @returns {Promise<string>} 分析结果文本
 */
export async function analyzeWithAI(type, payload) {
    const apiKey = process.env.SILICONFLOW_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error('未配置 AI API Key');
    }

    let systemPrompt, userContent;
    const images = payload.images || (payload.image ? [payload.image] : []);

    if (type === 'moment') {
        systemPrompt = MOMENT_PROMPT;
        userContent = [
            { type: 'text', text: '请分析以下朋友圈截图，推断用户的 MBTI 性格类型。' },
            ...images.map(img => ({ type: 'image_url', image_url: { url: img } }))
        ];
    } else if (type === 'chat') {
        systemPrompt = CHAT_PROMPT;
        userContent = [
            { type: 'text', text: '请分析以下聊天记录截图，解读沟通风格。' },
            ...images.map(img => ({ type: 'image_url', image_url: { url: img } }))
        ];
    } else if (type === 'htp') {
        systemPrompt = HTP_PROMPT;
        userContent = [
            { type: 'text', text: '请分析这幅房树人绘画作品。' },
            { type: 'image_url', image_url: { url: images[0] } }
        ];
    } else {
        throw new Error('不支持的分析类型');
    }

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
    ];

    // 优先使用 SiliconFlow，若未配置则回退到 DeepSeek
    if (process.env.SILICONFLOW_API_KEY) {
        return await callSiliconFlow(messages, process.env.SILICONFLOW_API_KEY);
    } else if (process.env.DEEPSEEK_API_KEY) {
        return await callDeepSeek(messages, process.env.DEEPSEEK_API_KEY);
    } else {
        throw new Error('未配置可用的 AI API Key');
    }
}
