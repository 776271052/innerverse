'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, X, Heart, Sparkles, LogOut, History } from 'lucide-react'
import { toast } from 'sonner'
import { AuthService } from '@/lib/auth'
import { DatabaseService } from '@/lib/redis'
import UploadZone from '@/components/UploadZone'
import AnalysisResult from '@/components/AnalysisResult'

const db = new DatabaseService()

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
      const u = await AuthService.verifySession(token)
      if (u) setUser(u)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const handleSubmit = async () => {
    if (images.length === 0) return toast.error('请上传至少一张图片 🌸')

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
        toast.success('AI 已温柔解析你的内心 ✨')
      } else {
        toast.error(data.error || '分析失败')
      }
    } catch (err) {
      toast.error('网络错误，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-pink via-pastel-purple to-pastel-mint dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <Heart className="w-10 h-10 text-pastel-rose" />
            <h1 className="text-5xl font-bold">内心宇宙</h1>
          </div>
          {user && (
            <button onClick={() => { localStorage.removeItem('auth_token'); window.location.reload() }} className="flex items-center gap-2 text-sm hover:text-pastel-rose transition">
              <LogOut size={18} /> 退出
            </button>
          )}
        </motion.header>

        <UploadZone images={images} setImages={setImages} />

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={isLoading || images.length === 0}
          className="mt-8 w-full py-7 text-2xl font-medium bg-gradient-to-r from-pastel-rose to-violet-400 text-white rounded-3xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <>AI 正在温柔解析你的内心… 🌸</>
          ) : (
            <>开始内心宇宙分析 ✨</>
          )}
        </motion.button>

        {analysisResult && <AnalysisResult result={analysisResult} images={images} />}
      </div>
    </div>
  )
}
