import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/redis'

const db = new DatabaseService()

export async function POST(request) {
  try {
    const { email, password, name } = await request.json()
    
    if (!email || !password || !name) {
      return NextResponse.json({ 
        success: false, 
        error: '邮箱、密码和姓名不能为空' 
      }, { status: 400 })
    }

    const existingUser = await db.getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: '邮箱已被注册' 
      }, { status: 400 })
    }

    const user = await db.createUser({
      email,
      name
    })
    
    return NextResponse.json({ 
      success: true,
      message: '注册成功'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 })
  }
}
