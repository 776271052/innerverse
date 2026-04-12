import { DatabaseService } from './redis'

const db = new DatabaseService()

export class AIProviderManager {
  constructor() {
    this.providers = {
      siliconflow: this.callSiliconFlow,
      openai: this.callOpenAI,
      anthropic: this.callAnthropic
    }
  }

  async getActiveProvider() {
    const config = await db.getDefaultApiConfig()
    const providers = Object.entries(config)
      .filter(([_, settings]) => JSON.parse(settings).enabled)
      .sort(([a, settingsA], [b, settingsB]) => 
        JSON.parse(settingsA).priority - JSON.parse(settingsB).priority
      )
    
    return providers[0]?.[0] || 'siliconflow'
  }

  async callSiliconFlow(prompt, images, model = 'Qwen/Qwen3-VL-8B-Instruct') {
    const config = await db.getDefaultApiConfig()
    const apiKey = JSON.parse(config.siliconflow || '{}').apiKey
    
    if (!apiKey) {
      throw new Error('SiliconFlow API key not configured')
    }

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: [
        { type: 'text', text: '请开始分析。' },
        ...images.map(url => ({ type: 'image_url', image_url: { url } }))
      ]}
    ]

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'InnerVerse/2.0'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || `API Error: ${response.status}`)
    }

    return data.choices[0].message.content
  }

  async callOpenAI(prompt, images, model = 'gpt-4-vision-preview') {
    const config = await db.getDefaultApiConfig()
    const apiKey = JSON.parse(config.openai || '{}').apiKey
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: [
        { type: 'text', text: prompt },
        ...images.map(url => ({ type: 'image_url', image_url: { url } }))
      ]}
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || `API Error: ${response.status}`)
    }

    return data.choices[0].message.content
  }

  async callAnthropic(prompt, images, model = 'claude-3-haiku-20240307') {
    const config = await db.getDefaultApiConfig()
    const apiKey = JSON.parse(config.anthropic || '{}').apiKey
    
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    const content = [
      { type: 'text', text: prompt },
      ...images.map(url => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: url.replace(/^data:image\/jpeg;base64,|^data:image\/png;base64,/, '')
        }
      }))
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content }]
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || `API Error: ${response.status}`)
    }

    return data.content[0].text
  }

  async analyze(prompt, images, model = null, preferredProvider = null) {
    const provider = preferredProvider || await this.getActiveProvider()
    
    if (!this.providers[provider]) {
      throw new Error(`Provider ${provider} not supported`)
    }

    try {
      const result = await this.providers[provider].call(this, prompt, images, model)
      return { result, provider }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error.message)
      
      // 如果指定了特定提供商失败，尝试其他可用提供商
      if (preferredProvider) {
        const config = await db.getDefaultApiConfig()
        const fallbackProviders = Object.entries(config)
          .filter(([name, settings]) => 
            name !== preferredProvider && JSON.parse(settings).enabled
          )
          .sort(([a, settingsA], [b, settingsB]) => 
            JSON.parse(settingsA).priority - JSON.parse(settingsB).priority
          )
        
        for (const [fallbackProvider] of fallbackProviders) {
          try {
            const result = await this.providers[fallbackProvider].call(this, prompt, images, model)
            return { result, provider: fallbackProvider }
          } catch (fallbackError) {
            console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError.message)
          }
        }
      }
      
      throw error
    }
  }
}
