import { NextResponse } from 'next/server'
import { AuthService } from '@/lib/auth'
import { DatabaseService } from '@/lib/redis'
import { AIProviderManager } from '@/lib/ai-providers'

const db = new DatabaseService()
const aiManager = new AIProviderManager()

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
    }

    let userId, isAnonymous = false
    if (token.startsWith('anonymous:')) {
      userId = token.replace('anonymous:', '')
      isAnonymous = true
    } else {
      const user = await AuthService.verifySession(token)
      if (!user) {
        return NextResponse.json({ success: false, error: '会话已过期' }, { status: 401 })
      }
      userId = user.id
    }

    const { type, images, selfDesc, scope, provider } = await request.json()
    
    if (!type || !['moment', 'chat', 'htp', 'emotional'].includes(type)) {
      return NextResponse.json({ success: false, error: '无效分析类型' }, { status: 400 })
    }
    
    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 3) {
      return NextResponse.json({ success: false, error: '图片数量1-3张' }, { status: 400 })
    }

    // 检查试用次数
    if (isAnonymous) {
      const trialCheck = await AuthService.validateTrialUsage(userId)
      if (!trialCheck.allowed) {
        return NextResponse.json({ 
          success: false, 
          error: `试用次数已用完（共5次）` 
        }, { status: 403 })
      }
    }

    const prompts = {
      moment: "你是一位资深心理分析师。请根据朋友圈截图推断MBTI类型，并在报告末尾附上一个JSON代码块，包含维度评分(0-100)和MBTI类型。格式示例：```json\n{\"type\":\"moment\",\"dimensions\":{\"E\":65,\"I\":35,\"S\":48,\"N\":52,\"T\":70,\"F\":30,\"J\":55,\"P\":45},\"mbtiType\":\"ENTJ\"}\n```",
      chat_private: "你是一位沟通心理学专家。分析私聊截图，末尾附JSON：```json\n{\"type\":\"chat_private\",\"dimensions\":{\"directness\":65,\"rationality\":70,\"initiative\":55,\"closeness\":60}}\n```",
      chat_group: "你是一位群体沟通心理学专家。分析群聊截图，末尾附JSON：```json\n{\"type\":\"chat_group\",\"dimensions\":{\"activity\":70,\"leadership\":45,\"positivity\":80},\"role\":\"意见领袖\"}\n```",
      htp: "你是房树人绘画分析师。分析绘画，末尾附JSON：```json\n{\"type\":\"htp\",\"dimensions\":{\"security\":60,\"family\":70,\"self\":55,\"growth\":65,\"openness\":50}}\n```",
      emotional: "你是一位情绪分析专家。请分析用户的情绪状态，提供情绪调节建议，并在报告末尾附上JSON：```json\n{\"type\":\"emotional\",\"mood_score\":75,\"stress_level\":3,\"recommendations\":[\"建议进行放松练习\",\"推荐与朋友交流\"]}\n```"
    }

    let systemPrompt
    if (type === 'chat') {
      systemPrompt = scope === 'group' ? prompts.chat_group : prompts.chat_private
    } else {
      systemPrompt = prompts[type]
    }

    try {
      const { result, provider: usedProvider } = await aiManager.analyze(
        systemPrompt, 
        images, 
        null, 
        provider
      )

      // 更新试用次数（如果是匿名用户）
      if (isAnonymous) {
        await db.updateUserTrialCount(userId, 1)
      }

      // 保存分析记录
      const analysis = await db.createAnalysis(userId, {
        type,
        images,
        selfDesc,
        scope,
        result,
        provider: usedProvider
      })

      // 更新统计
      await db.updateStats(usedProvider)

      return NextResponse.json({ 
        success: true, 
        result,
        provider: usedProvider
      })
    } catch (aiError) {
      console.error('AI Analysis error:', aiError)
      return NextResponse.json({ 
        success: false, 
        error: `AI分析失败: ${aiError.message}` 
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
