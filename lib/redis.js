import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export class DatabaseService {
  async createAnalysis(userId, data) {
    const id = Date.now().toString()
    await redis.hset(`analysis:${userId}:${id}`, data)
    await redis.zadd(`user:analyses:${userId}`, Date.now(), id)
    return id
  }

  async getUserAnalyses(userId) {
    const ids = await redis.zrange(`user:analyses:${userId}`, 0, -1)
    const pipeline = redis.pipeline()
    ids.forEach(id => pipeline.hgetall(`analysis:${userId}:${id}`))
    const results = await pipeline.exec()
    return results.map(r => r.data)
  }
}
