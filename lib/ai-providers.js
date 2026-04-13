import { prompts } from './prompts'

export class AIProviderManager {
  constructor() {
    this.defaultProvider = 'siliconflow'
  }

  async analyze(images, type, selfDesc = '') {
    const apiKey = process.env.SILICONFLOW_API_KEY

    if (!apiKey) {
      return {
        success: false,
        error: 'AI 服务密钥未配置，请联系管理员'
      }
    }

    const systemPrompt = prompts[type] || prompts.moment

    const userContent = [
      { type: "text", text: `用户额外描述：${selfDesc || '没有额外描述'}` },
      ...images.map(img => ({
        type: "image_url",
        image_url: { url: img }
      }))
    ]

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-VL-72B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.choices?.[0]?.message?.content || 'AI 暂未返回内容'

      return {
        success: true,
        result: resultText
      }
    } catch (error) {
      console.error('AI Provider Error:', error)
      return {
        success: false,
        error: 'AI 服务暂时不可用，请稍后再试 🌸'
      }
    }
  }
}
