// workers/queue-consumer/src/ai-client.ts
import { TaskType } from '../../../functions/lib/types';

// 提示词定义
const PROMPTS: Record<TaskType, string> = {
    moment: `你是一位资深心理分析师，擅长通过朋友圈内容分析用户性格。
请根据用户提供的朋友圈截图内容，输出一份详细的 MBTI 性格分析报告。
格式要求：
1. 推断最可能的 MBTI 类型（如 INFJ、ESTP 等）
2. 各维度倾向性评分（0-100分）：E/I、S/N、T/F、J/P
3. 详细分析（约300字）：从内容中解读用户的兴趣、价值观、社交风格
4. 给出生活建议

请直接输出分析报告，不要输出其他无关内容。`,
    chat: `你是一位沟通心理学专家，擅长分析对话中的沟通风格和关系模式。
请根据用户提供的聊天记录截图，分析以下内容：
1. 整体沟通风格（如：直接/委婉、理性/感性、主动/被动等）
2. 双方关系推测（如：亲密程度、权力关系）
3. 情绪表达特点
4. 改进沟通的建议

请输出一份结构清晰的分析报告，约300-400字。`,
    htp: `你是一位专业的绘画心理分析师，精通房树人（HTP）投射测验。
请根据用户提供的绘画作品（包含房子、树、人），从以下维度进行分析：
1. 整体印象与构图特点
2. 房子分析（象征家庭、安全感）
3. 树木分析（象征自我成长、生命力）
4. 人物分析（象征自我认知、人际关系）
5. 综合心理状态评估与建议

请输出专业且富有同理心的分析报告，约400字。`
};

interface Env {
    SILICONFLOW_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
}

const SILICONFLOW_BASE = 'https://api.siliconflow.cn/v1/chat/completions';
const HTP_VISION_MODEL = 'Qwen/Qwen3-VL-8B-Instruct';
const TEXT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

async function callSiliconFlow(apiKey: string, model: string, messages: any[], maxTokens = 1024): Promise<string> {
    const res = await fetch(SILICONFLOW_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SiliconFlow API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

async function callDeepSeek(apiKey: string, messages: any[], maxTokens = 1024): Promise<string> {
    const res = await fetch(DEEPSEEK_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature: 0.7, max_tokens: maxTokens })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
}

export async function analyzeWithAI(env: Env, type: TaskType, imagesBase64: string[]): Promise<string> {
    const systemPrompt = PROMPTS[type];
    const userContent: any[] = [
        { type: 'text', text: '请开始分析。' },
        ...imagesBase64.map(img => ({ type: 'image_url', image_url: { url: img } }))
    ];
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
    ];

    // 房树人强制使用 SiliconFlow 视觉模型
    if (type === 'htp') {
        if (!env.SILICONFLOW_API_KEY) {
            throw new Error('未配置 SILICONFLOW_API_KEY，无法进行房树人分析');
        }
        return await callSiliconFlow(env.SILICONFLOW_API_KEY, HTP_VISION_MODEL, messages, 1024);
    }

    // 朋友圈/聊天：优先 DeepSeek，回退 SiliconFlow
    if (env.DEEPSEEK_API_KEY) {
        return await callDeepSeek(env.DEEPSEEK_API_KEY, messages, 1024);
    } else if (env.SILICONFLOW_API_KEY) {
        return await callSiliconFlow(env.SILICONFLOW_API_KEY, TEXT_MODEL, messages, 1024);
    } else {
        throw new Error('未配置任何可用的 AI API Key (DEEPSEEK_API_KEY 或 SILICONFLOW_API_KEY)');
    }
}
