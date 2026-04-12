import { nanoid } from 'nanoid'
import { DatabaseService } from './redis'

const db = new DatabaseService()

export class AuthService {
  static generateToken(payload) {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    const claims = btoa(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }))
    const signature = nanoid(16)
    return `${header}.${claims}.${signature}`
  }

  static verifyToken(token) {
    try {
      const [, claims] = token.split('.')
      const payload = JSON.parse(atob(claims))
      if (payload.exp < Date.now()) return null
      return payload
    } catch {
      return null
    }
  }

  static async createSession(email) {
    const user = await db.getUserByEmail(email)
    if (!user) return null

    const token = this.generateToken({ userId: user.id, email: user.email, role: user.role })
    await redis.setex(`session:${token}`, 86400, user.id)
    
    return { token, user }
  }

  static async verifySession(token) {
    if (!token) return null
    
    const userId = await redis.get(`session:${token}`)
    if (!userId) return null

    const user = await db.getUserByEmail(await redis.hget(`user:${userId}`, 'email'))
    return user
  }

  // 验证试用次数
  static async validateTrialUsage(userId) {
    const user = await db.getUserById(userId)
    if (!user) return { allowed: false, remaining: 0 }
    
    const used = parseInt(user.trialUsed) || 0
    const remaining = 5 - used
    const allowed = remaining > 0
    
    return { allowed, remaining, used }
  }
}
