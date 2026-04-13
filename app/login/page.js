'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, LogIn, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AuthService } from '@/lib/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请输入用户名和密码')
      return
    }

    setIsLoading(true)
    try {
      const user = await AuthService.adminLogin(username, password)

      if (user) {
        const token = await AuthService.createSession(user)
        localStorage.setItem('auth_token', token)
        
        toast.success('管理员登录成功！欢迎回来 🌸', { duration: 2000 })
        setTimeout(() => {
          window.location.href = '/'
        }, 800)
      } else {
        toast.error('用户名或密码错误')
      }
    } catch (err) {
      toast.error('登录失败，请稍后再试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastel-pink via-pastel-purple to-pastel-mint flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass w-full max-w-md rounded-3xl p-10 shadow-xl"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-sm mb-6 hover:text-pastel-rose">
          <ArrowLeft size={18} /> 返回首页
        </Link>

        <div className="flex flex-col items-center mb-8">
          <Heart className="w-16 h-16 text-pastel-rose mb-4" />
          <h1 className="text-4xl font-bold">管理员登录</h1>
          <p className="text-muted-foreground mt-2">InnerVerse 后台管理</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm mb-2 font-medium">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-pastel-rose focus:outline-none"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2 font-medium">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:border-pastel-rose focus:outline-none"
              placeholder="admin123"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-pastel-rose to-violet-500 text-white rounded-2xl font-medium text-lg flex items-center justify-center gap-3 disabled:opacity-70"
          >
            <LogIn size={24} />
            {isLoading ? '登录中...' : '立即登录后台'}
          </motion.button>
        </form>

        <div className="text-center text-xs text-muted-foreground mt-8">
          默认账号：<span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
        </div>
      </motion.div>
    </div>
  )
}
