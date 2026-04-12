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
    const data = await redis.get(`session:${token}`)
    return data ? JSON.parse(data) : null
  },

  async validateTrialUsage(userId) {
    const key = `trial:${userId}`
    const used = await redis.get(key) || 0
    return { allowed: used < 5, remaining: 5 - used }
  }
}
