import { prompts } from './prompts'

export class AIProviderManager {
  constructor() {
    this.providers = {
      siliconflow: {
        url: 'https://api.siliconflow.cn/v1/chat/completions',
        model: 'Qwen/Qwen2.5-VL-72B-Instruct',
        apiKey: process.env.SILICONFLOW_API_KEY
      },
      openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY
      },
      anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY
      }
    }
  }

  async analyze(images, type, selfDesc = '') {
    const provider = this.providers.siliconflow // 默认使用 SiliconFlow，可改成 'openai' 或 'anthropic'
    const systemPrompt = prompts[type] || prompts.moment

    // 构造消息
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `用户描述：${selfDesc || '无额外描述'}` },
          ...images.map((img) => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ]
      }
    ]

    try {
      let response

      if (provider === this.providers.anthropic) {
        // Anthropic 特殊格式
        response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: provider.model,
            max_tokens: 2000,
            messages: messages
          })
        })
      } else {
        // OpenAI / SiliconFlow 兼容格式
        response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.apiKey}`
          },
          body: JSON.stringify({
            model: provider.model,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
          })
        })
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      
      // 统一提取文本
      let resultText = ''
      if (data.choices && data.choices[0]) {
        resultText = data.choices[0].message.content
      } else if (data.content) {
        resultText = data.content[0].text
      } else {
        resultText = JSON.stringify(data)
      }

      return {
        success: true,
        result: resultText
      }
    } catch (error) {
      console.error('AI analyze error:', error)
      return {
        success: false,
        error: 'AI 服务暂时不可用，请稍后再试 🌸'
      }
    }
  }
}
