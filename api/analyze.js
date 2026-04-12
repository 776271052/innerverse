exports.default = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    try {
        const { type, images, selfDesc, scope } = req.body;
        if (!type || !['moment', 'chat', 'htp', 'emotional'].includes(type)) return res.status(400).json({ success: false, error: '无效分析类型' });
        if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) return res.status(400).json({ success: false, error: '图片数量1-3张' });

        const apiKey = process.env.SILICONFLOW_API_KEY;
        if (!apiKey) return res.status(500).json({ success: false, error: '未配置 SILICONFLOW_API_KEY' });

        let model;
        if (type === 'htp' || type === 'emotional') {
            model = process.env.AI_VISION_MODEL || 'Qwen/Qwen3-VL-8B-Instruct';
        } else {
            model = process.env.AI_TEXT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
        }

        const prompts = {
            moment: "你是一位资深心理分析师。请根据朋友圈截图推断MBTI类型，并在报告末尾附上一个JSON代码块，包含维度评分(0-100)和MBTI类型。格式示例：```json\n{\"type\":\"moment\",\"dimensions\":{\"E\":65,\"I\":35,\"S\":48,\"N\":52,\"T\":70,\"F\":30,\"J\":55,\"P\":45},\"mbtiType\":\"ENTJ\"}\n```",
            chat_private: "你是一位沟通心理学专家。分析私聊截图，末尾附JSON：```json\n{\"type\":\"chat_private\",\"dimensions\":{\"directness\":65,\"rationality\":70,\"initiative\":55,\"closeness\":60}}\n```",
            chat_group: "你是一位群体沟通心理学专家。分析群聊截图，末尾附JSON：```json\n{\"type\":\"chat_group\",\"dimensions\":{\"activity\":70,\"leadership\":45,\"positivity\":80},\"role\":\"意见领袖\"}\n```",
            htp: "你是房树人绘画分析师。分析绘画，末尾附JSON：```json\n{\"type\":\"htp\",\"dimensions\":{\"security\":60,\"family\":70,\"self\":55,\"growth\":65,\"openness\":50}}\n```",
            emotional: "你是一位情绪分析专家。请分析用户的情绪状态，提供情绪调节建议，并在报告末尾附上JSON：```json\n{\"type\":\"emotional\",\"mood_score\":75,\"stress_level\":3,\"recommendations\":[\"建议进行放松练习\",\"推荐与朋友交流\"]}\n```"
        };

        let systemPrompt;
        if (type === 'chat') {
            systemPrompt = scope === 'group' ? prompts.chat_group : prompts.chat_private;
        } else {
            systemPrompt = prompts[type];
        }

        const userContent = [{ type: 'text', text: selfDesc ? `用户描述：${selfDesc}` : '请开始分析。' }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))];
        const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }];

        const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
        });

        const data = await response.json();
        if (!response.ok) {
            const err = data.error?.message || data.message || JSON.stringify(data);
            return res.status(response.status).json({ success: false, error: `SiliconFlow 返回错误 (${response.status}): ${err}` });
        }

        // 保存分析结果到数据库（如果有的话）
        // 这里可以添加数据库操作代码

        return res.status(200).json({ success: true, result: data.choices[0].message.content });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
