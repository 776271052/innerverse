import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export class DatabaseService {
  async createAnalysis(userId, data) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const key = `analysis:${userId}:${id}`

    await redis.hset(key, {
      ...data,
      createdAt: Date.now().toString()
    })

    await redis.zadd(`user:analyses:${userId}`, Date.now(), id)
    return id
  }

  async getUserAnalyses(userId) {
    try {
      const ids = await redis.zrange(`user:analyses:${userId}`, 0, -1, { rev: true })
      if (ids.length === 0) return []

      const pipeline = redis.pipeline()
      ids.forEach(id => pipeline.hgetall(`analysis:${userId}:${id}`))
      const results = await pipeline.exec()

      return results.map((res, i) => ({
        id: ids[i],
        ...res.data
      }))
    } catch (e) {
      console.error(e)
      return []
    }
  }
}
