import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export class DatabaseService {
  async createAnalysis(userId, analysisData) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2)
    const key = `analysis:${userId}:${id}`
    
    await redis.hset(key, {
      ...analysisData,
      createdAt: Date.now()
    })
    
    await redis.zadd(`user:analyses:${userId}`, Date.now(), id)
    return id
  }

  async getUserAnalyses(userId) {
    try {
      const ids = await redis.zrange(`user:analyses:${userId}`, 0, -1, { rev: true })
      if (ids.length === 0) return []

      const pipeline = redis.pipeline()
      ids.forEach(id => {
        pipeline.hgetall(`analysis:${userId}:${id}`)
      })
      
      const results = await pipeline.exec()
      return results
        .map((res, index) => res.data ? { id: ids[index], ...res.data } : null)
        .filter(Boolean)
    } catch (e) {
      console.error('Get analyses error:', e)
      return []
    }
  }
}
