import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export class DatabaseService {
  // 获取默认API配置
  async getDefaultApiConfig() {
    const config = await redis.hgetall('api_config:default')
    if (!config || Object.keys(config).length === 0) {
      // 设置默认配置
      await this.setDefaultApiConfig({
        siliconflow: {
          apiKey: process.env.SILICONFLOW_API_KEY || '',
          enabled: !!process.env.SILICONFLOW_API_KEY,
          priority: 1
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          enabled: !!process.env.OPENAI_API_KEY,
          priority: 2
        },
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          enabled: !!process.env.ANTHROPIC_API_KEY,
          priority: 3
        }
      })
      return await redis.hgetall('api_config:default')
    }
    return config
  }

  // 设置API配置
  async setDefaultApiConfig(config) {
    const configToSave = {}
    for (const [provider, settings] of Object.entries(config)) {
      configToSave[provider] = JSON.stringify(settings)
    }
    await redis.hset('api_config:default', configToSave)
  }

  // 创建分析记录
  async createAnalysis(userId, analysisData) {
    const id = crypto.randomUUID()
    const analysis = {
      id,
      userId,
      type: analysisData.type,
      images: JSON.stringify(analysisData.images),
      selfDesc: analysisData.selfDesc,
      scope: analysisData.scope,
      result: analysisData.result,
      provider: analysisData.provider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await redis.hset(`analysis:${id}`, analysis)
    await redis.zadd(`user:${userId}:analyses`, Date.now(), id)
    await redis.incr('stats:total_analyses')
    await redis.incr(`stats:provider:${analysisData.provider}`)
    
    return analysis
  }

  // 获取用户分析历史
  async getUserAnalyses(userId, limit = 10) {
    const analysisIds = await redis.zrevrange(`user:${userId}:analyses`, 0, limit - 1)
    const analyses = []
    
    for (const id of analysisIds) {
      const analysis = await redis.hgetall(`analysis:${id}`)
      if (analysis) {
        analysis.images = JSON.parse(analysis.images)
        analyses.push(analysis)
      }
    }
    
    return analyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  // 获取单个分析记录
  async getAnalysisById(id) {
    const analysis = await redis.hgetall(`analysis:${id}`)
    if (analysis) {
      analysis.images = JSON.parse(analysis.images)
    }
    return analysis
  }

  // 获取所有分析记录（管理员用）
  async getAllAnalyses(page = 0, limit = 20) {
    const keys = await redis.keys('analysis:*')
    const start = page * limit
    const end = start + limit - 1
    
    const paginatedKeys = keys.slice(start, end)
    const analyses = []
    
    for (const key of paginatedKeys) {
      const analysis = await redis.hgetall(key)
      if (analysis) {
        analysis.images = JSON.parse(analysis.images)
        analyses.push(analysis)
      }
    }
    
    return {
      data: analyses,
      total: keys.length,
      page,
      limit
    }
  }

  // 创建用户
  async createUser(userData) {
    const id = crypto.randomUUID()
    const user = {
      id,
      email: userData.email,
      name: userData.name,
      role: 'user',
      trialUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await redis.hset(`user:${id}`, user)
    await redis.set(`email:${userData.email}`, id)
    await redis.incr('stats:total_users')
    
    return user
  }

  // 获取用户
  async getUserByEmail(email) {
    const userId = await redis.get(`email:${email}`)
    if (!userId) return null
    
    return await redis.hgetall(`user:${userId}`)
  }

  // 获取用户
  async getUserById(userId) {
    return await redis.hgetall(`user:${userId}`)
  }

  // 更新用户试用次数
  async updateUserTrialCount(userId, increment = 1) {
    const user = await this.getUserById(userId)
    if (user) {
      const newCount = Math.min(parseInt(user.trialUsed) + increment, 5)
      await redis.hset(`user:${userId}`, { trialUsed: newCount.toString() })
      return newCount
    }
    return 0
  }

  // 验证管理员
  async validateAdmin(credentials) {
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    
    return credentials.email === adminEmail && credentials.password === adminPassword
  }

  // 获取统计信息
  async getStats() {
    const [
      totalUsers,
      totalAnalyses,
      dailyAnalyses,
      weeklyAnalyses,
      providerStats
    ] = await Promise.all([
      redis.get('stats:total_users'),
      redis.get('stats:total_analyses'),
      redis.get('stats:daily_analyses'),
      redis.get('stats:weekly_analyses'),
      redis.hgetall('stats:providers')
    ])
    
    return {
      totalUsers: parseInt(totalUsers) || 0,
      totalAnalyses: parseInt(totalAnalyses) || 0,
      dailyAnalyses: parseInt(dailyAnalyses) || 0,
      weeklyAnalyses: parseInt(weeklyAnalyses) || 0,
      providerStats: providerStats || {}
    }
  }

  // 更新统计
  async updateStats(provider) {
    const today = new Date().toISOString().split('T')[0]
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
    
    await redis.incr('stats:daily_analyses')
    await redis.setex(`daily_count:${today}`, 86400, 1)
    await redis.incrby(`weekly_count:${week}`, 1)
    await redis.incr(`stats:provider:${provider}`)
  }
}
