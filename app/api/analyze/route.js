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

    // 获取用户身份
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const user = await AuthService.verifySession(token)
      if (user) userId = user.id
    } else {
      userId = 'anonymous_' + (body.anonymousId || Date.now())
    }

    // 调用 AI 分析
    const aiResult = await aiManager.analyze(images, type, selfDesc || '')

    if (!aiResult.success) {
      return NextResponse.json(aiResult, { status: 500 })
    }

    // 保存分析记录到 Upstash
    if (userId) {
      await db.createAnalysis(userId, {
        type,
        result: aiResult.result,
        imagesCount: images.length,
        scope: scope || 'private',
        createdAt: Date.now().toString()
      })

      // 增加试用次数（仅非管理员）
      if (!userId.startsWith('admin')) {
        await AuthService.incrementTrialUsage(userId)
      }
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
