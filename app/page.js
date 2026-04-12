'use client'

import { useState, useRef, useEffect } from 'react'
import { AuthService } from '@/lib/auth'
import { DatabaseService } from '@/lib/redis'
import { AIProviderManager } from '@/lib/ai-providers'

const db = new DatabaseService()
const aiManager = new AIProviderManager()

export default function Home() {
  const [images, setImages] = useState([])
  const [analysisResult, setAnalysisResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('moment')
  const [selectedScope, setSelectedScope] = useState('private')
  const [selfDesc, setSelfDesc] = useState('')
  const [history, setHistory] = useState([])
  const [user, setUser] = useState(null)
  const [trialInfo, setTrialInfo] = useState({ allowed: true, remaining: 5, used: 0 })
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [apiProvider, setApiProvider] = useState('auto')
  const fileInputRef = useRef(null)

  useEffect(() => {
    checkAuthStatus()
    loadUserHistory()
  }, [])

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const verifiedUser = await AuthService.verifySession(token)
      if (verifiedUser) {
        setUser(verifiedUser)
        if (verifiedUser.role === 'admin') {
          loadTrialInfo(verifiedUser.id)
        }
      } else {
        localStorage.removeItem('auth_token')
      }
    } else {
      // 匿名用户检查试用次数
      const anonymousId = localStorage.getItem('anonymous_user_id') || crypto.randomUUID()
      localStorage.setItem('anonymous_user_id', anonymousId)
      loadTrialInfo(anonymousId)
    }
  }

  const loadTrialInfo = async (userId) => {
    const info = await AuthService.validateTrialUsage(userId)
    setTrialInfo(info)
  }

  const loadUserHistory = async () => {
    if (user) {
      try {
        const analyses = await db.getUserAnalyses(user.id)
        setHistory(analyses)
      } catch (error) {
        console.error('Failed to load history:', error)
      }
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + images.length > 3) {
      alert('最多只能上传3张图片')
      return
    }
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImages(prev => [...prev, event.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('auth_token', data.token)
        setUser(data.user)
        setShowLoginModal(false)
        loadUserHistory()
        loadTrialInfo(data.user.id)
      } else {
        alert(data.error || '登录失败')
      }
    } catch (error) {
      alert('网络错误，请稍后重试')
    }
  }

  const handleRegister = async (email, password, name) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('注册成功，请登录')
      } else {
        alert(data.error || '注册失败')
      }
    } catch (error) {
      alert('网络错误，请稍后重试')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setHistory([])
    // 重置为匿名用户
    const anonymousId = localStorage.getItem('anonymous_user_id') || crypto.randomUUID()
    localStorage.setItem('anonymous_user_id', anonymousId)
    loadTrialInfo(anonymousId)
  }

  const handleSubmit = async () => {
    if (images.length === 0) {
      alert('请至少上传一张图片')
      return
    }

    // 检查使用权限
    let userId = user?.id
    if (!user) {
      userId = localStorage.getItem('anonymous_user_id')
      if (!userId) {
        userId = crypto.randomUUID()
        localStorage.setItem('anonymous_user_id', userId)
      }
    }

    const trialCheck = await AuthService.validateTrialUsage(userId)
    if (!user && !trialCheck.allowed) {
      alert(`试用次数已用完（共5次），请注册登录后继续使用`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'anonymous:' + userId}`
        },
        body: JSON.stringify({
          type: selectedType === 'chat' ? 'chat' : selectedType,
          images: images,
          selfDesc: selfDesc,
          scope: selectedScope,
          provider: apiProvider === 'auto' ? null : apiProvider
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAnalysisResult(data.result)
        
        if (user) {
          await db.createAnalysis(user.id, {
            type: selectedType,
            images: images,
            selfDesc: selfDesc,
            scope: selectedScope,
            result: data.result,
            provider: data.provider
          })
          loadUserHistory()
        }
      } else {
        alert(`分析失败: ${data.error}`)
      }
    } catch (error) {
      alert(`请求失败: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            内心宇宙 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400">InnerVerse</span>
          </h1>
          <p className="text-xl text-gray-300">AI驱动的心理分析与成长平台</p>
          
          <div className="mt-4">
            {user ? (
              <div className="flex items-center justify-center space-x-4">
                <span className="text-white">欢迎, {user.name || user.email}</span>
                <span className="text-green-400">({user.role === 'admin' ? '管理员' : '已登录'})</span>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  退出
                </button>
                {user.role === 'admin' && (
                  <a href="/admin" className="px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors">
                    管理员
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                <span className="text-yellow-400">试用剩余: {trialInfo.remaining}/5</span>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  登录/注册
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-6">分析选项</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-white mb-2">分析类型</label>
                        <select 
                          value={selectedType} 
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="moment">朋友圈分析</option>
                          <option value="chat">聊天记录分析</option>
                          <option value="htp">房树人绘画分析</option>
                          <option value="emotional">情绪状态分析</option>
                        </select>
                      </div>

                      {selectedType === 'chat' && (
                        <div>
                          <label className="block text-white mb-2">聊天范围</label>
                          <select 
                            value={selectedScope} 
                            onChange={(e) => setSelectedScope(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="private">私聊</option>
                            <option value="group">群聊</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-white mb-2">AI提供商</label>
                        <select 
                          value={apiProvider} 
                          onChange={(e) => setApiProvider(e.target.value)}
                          className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="auto">自动选择</option>
                          <option value="siliconflow">SiliconFlow</option>
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-white mb-2">个人描述 (可选)</label>
                        <textarea
                          value={selfDesc}
                          onChange={(e) => setSelfDesc(e.target.value)}
                          placeholder="请输入相关背景信息..."
                          className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                        />
                      </div>

                      <div>
                        <label className="block text-white mb-2">上传图片 (1-3张)</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          选择图片
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">已上传图片</h3>
                    <div className="space-y-4">
                      {images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={img} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {images.length === 0 && (
                        <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center text-gray-400">
                          尚未上传图片
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading || images.length === 0}
                      className="w-full mt-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? '分析中...' : '开始分析'}
                    </button>
                  </div>
                </div>

                {analysisResult && (
                  <div className="mt-8 p-6 bg-white/10 rounded-lg border border-white/20">
                    <h3 className="text-xl font-semibold text-white mb-4">分析结果</h3>
                    <div className="prose prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-gray-300">{analysisResult}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 h-fit">
                <h3 className="text-xl font-semibold text-white mb-4">历史记录</h3>
                
                {history.length === 0 ? (
                  <p className="text-gray-400">暂无分析记录</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {history.slice(0, 10).map((record) => (
                      <div 
                        key={record.id}
                        className="p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => setAnalysisResult(record.result)}
                      >
                        <div className="text-sm text-gray-300">
                          {new Date(record.createdAt).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          类型: {record.type} | AI: {record.provider}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center mt-12 text-gray-400">
          <p>&copy; 2026 内心宇宙 InnerVerse. 用AI探索内心世界.</p>
        </footer>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full">
            <h3 className="text-2xl font-semibold text-white mb-6 text-center">账户管理</h3>
            <LoginRegisterForm 
              onLogin={handleLogin}
              onRegister={handleRegister}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .prose pre {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          overflow-x: auto;
        }
        .max-h-96 {
          max-height: 24rem;
        }
        .overflow-y-auto {
          overflow-y: auto;
        }
      `}</style>
    </div>
  )
}

function LoginRegisterForm({ onLogin, onRegister, onClose }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({ email: '', password: '', name: '' })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isLogin) {
      onLogin(formData.email, formData.password)
    } else {
      onRegister(formData.email, formData.password, formData.name)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-white mb-2">姓名</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required={!isLogin}
              className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}
        
        <div>
          <label className="block text-white mb-2">邮箱</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div>
          <label className="block text-white mb-2">密码</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex space-x-4 mt-6">
        <button
          type="submit"
          className="flex-1 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          {isLogin ? '登录' : '注册'}
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="flex-1 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          {isLogin ? '去注册' : '去登录'}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full mt-4 p-2 text-gray-400 hover:text-white transition-colors"
      >
        取消
      </button>
    </form>
  )
}
