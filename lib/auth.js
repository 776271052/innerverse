import { Redis } from '@upstash/redis'
import { nanoid } from 'nanoid'

const redis = Redis.fromEnv()

export const AuthService = {
  async createSession(user) {
    const token = nanoid(32)
    await redis.setex(`session:${token}`, 60 * 60 * 24 * 7, JSON.stringify(user))
    return token
  },

  async verifySession(token) {
    if (!token) return null
    try {
      const data = await redis.get(`session:${token}`)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Session verify error:', e)
      return null
    }
  },

  async validateTrialUsage(userId) {
    if (!userId) return { allowed: false, remaining: 0 }
    
    const key = `trial:${userId}`
    const used = parseInt(await redis.get(key) || '0')
    
    return {
      allowed: used < 5,
      remaining: 5 - used,
      used: used
    }
  },

  async incrementTrialUsage(userId) {
    const key = `trial:${userId}`
    await redis.incr(key)
    await redis.expire(key, 60 * 60 * 24 * 30) // 30天过期
  }
}
