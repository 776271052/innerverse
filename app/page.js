'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Heart, Sparkles, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import UploadZone from '@/components/UploadZone'
import AnalysisResult from '@/components/AnalysisResult'
import { AuthService } from '@/lib/auth'

export default function Home() {
  const [images, setImages] = useState([])
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('moment')
  const [selfDesc, setSelfDesc] = useState('')
  const [user, setUser] = useState(null)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const verifiedUser = await AuthService.verifySession(token)
      if (verifiedUser) setUser(verifiedUser)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSubmit = async () => {
    if (images.length === 0) {
      toast.error('请至少上传一张照片 🌸')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          images,
          selfDesc,
          scope: 'private'
        })
      })

      const data = await res.json()

      if (data.success) {
        setAnalysisResult(data.result)
        toast.success('AI 已温柔解析完成 ✨')
      } else {
        toast.error(data.error || '分析失败')
      }
    } catch (error) {
      toast.error('请求失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-pink via-pastel-purple to-pastel-mint dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-12"
        >
          <div className="flex items-center gap-4">
            <Heart className="w-12 h-12 text-pastel-rose" />
            <div>
              <h1 className="text-5xl font-bold tracking-tight">内心宇宙</h1>
              <p className="text-sm text-muted-foreground">用照片，温柔看见内在的你</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <a href="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/70 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 transition">
                <LogIn size={18} /> 管理员登录
              </a>
            ) : (
              <button 
                onClick={() => {
                  localStorage.removeItem('auth_token')
                  window.location.reload()
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl hover:bg-white/70 dark:hover:bg-slate-700 transition"
              >
                <LogOut size={18} /> 退出
              </button>
            )}
          </div>
        </motion.header>

        <UploadZone images={images} setImages={setImages} />

        <div className="flex gap-4 mt-8 justify-center flex-wrap">
          {['moment', 'mbti', 'emotion', 'painting'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-6 py-3 rounded-2xl transition-all ${
                selectedType === type 
                  ? 'bg-pastel-rose text-white shadow-lg' 
                  : 'glass hover:bg-white/60 dark:hover:bg-slate-800'
              }`}
            >
              {type === 'moment' && '内心时刻'}
              {type === 'mbti' && 'MBTI画像'}
              {type === 'emotion' && '情绪分析'}
              {type === 'painting' && '绘画心理'}
            </button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading || images.length === 0}
          className="mt-10 w-full py-8 text-2xl font-medium bg-gradient-to-r from-pastel-rose via-violet-500 to-purple-500 text-white rounded-3xl shadow-2xl flex items-center justify-center gap-4 disabled:opacity-70"
        >
          {isLoading ? 'AI 正在温柔解析你的内心… 🌸' : '开始内心宇宙分析 ✨'}
        </motion.button>

        {analysisResult && <AnalysisResult result={analysisResult} images={images} />}
      </div>
    </div>
  )
}
