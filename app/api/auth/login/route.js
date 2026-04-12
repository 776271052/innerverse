import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/redis'
import { AuthService } from '@/lib/auth'

const db = new DatabaseService()

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: '邮箱和密码不能为空' 
      }, { status: 400 })
    }

    const user = await db.getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '用户不存在' 
      }, { status: 400 })
    }

    // 管理员验证
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = AuthService.generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: 'admin' 
      })
      
      return NextResponse.json({ 
        success: true, 
        token,
        user: { ...user, role: 'admin' }
      })
    }

    // 简化的密码验证（实际应用中需要真正的密码哈希验证）
    if (password === 'correct_password') { // 这里需要真实的密码验证逻辑
      const token = AuthService.generateToken({ 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      })
      
      return NextResponse.json({ 
        success: true, 
        token,
        user
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: '密码错误' 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 })
  }
}
