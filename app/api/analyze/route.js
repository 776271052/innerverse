import { NextResponse } from 'next/server'
import { AIProviderManager } from '@/lib/ai-providers'
import { AuthService } from '@/lib/auth'
import { DatabaseService } from '@/lib/redis'

const aiManager = new AIProviderManager()
const db = new DatabaseService()

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, images, selfDesc, scope } = body

    if (!images || images.length === 0) {
      return NextResponse.json({ success: false, error: '请上传至少一张图片' }, { status: 400 })
    }

    // 试用次数校验（匿名用户）
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const user = await AuthService.verifySession(token)
      if (user) userId = user.id
    } else {
      // 匿名用户使用 localStorage 中的 anonymous_user_id（前端已处理）
      userId = 'anonymous_' + (body.anonymousId || 'temp')
    }

    // 校验试用次数
    if (!userId.includes('anonymous')) {
      const trial = await AuthService.validateTrialUsage(userId)
      if (!trial.allowed) {
        return NextResponse.json({ success: false, error: '试用次数已用完，请登录账号' }, { status: 403 })
      }
    }

    // 调用 AI 分析
    const aiResult = await aiManager.analyze(images, type, selfDesc)

    if (!aiResult.success) {
      return NextResponse.json(aiResult, { status: 500 })
    }

    // 保存到数据库（仅登录用户）
    if (userId && !userId.includes('anonymous')) {
      await db.createAnalysis(userId, {
        type,
        result: aiResult.result,
        images: images.length,
        scope: scope || 'private'
      })
      // 增加试用计数
      await AuthService.incrementTrialUsage(userId)
    }

    return NextResponse.json({
      success: true,
      result: aiResult.result
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误，请稍后再试'
    }, { status: 500 })
  }
}
