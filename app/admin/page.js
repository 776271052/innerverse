'use client'

import { useState, useEffect } from 'react'
import { AuthService } from '@/lib/auth'
import { DatabaseService } from '@/lib/redis'

const db = new DatabaseService()

export default function AdminPage() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({})
  const [analyses, setAnalyses] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [apiConfig, setApiConfig] = useState({})
  const [showApiConfig, setShowApiConfig] = useState(false)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      const verifiedUser = await AuthService.verifySession(token)
      if (verifiedUser && verifiedUser.role === 'admin') {
        setUser(verifiedUser)
        loadDashboardData()
        loadApiConfig()
      } else {
        localStorage.removeItem('auth_token')
        setUser(null)
      }
    }
    setLoading(false)
  }

  const loadDashboardData = async () => {
    try {
      const statsData = await db.getStats()
      setStats(statsData)
      
      const analysesData = await db.getAllAnalyses(currentPage, 20)
      setAnalyses(analysesData.data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const loadApiConfig = async () => {
    try {
      const config = await db.getDefaultApiConfig()
      setApiConfig(config)
    } catch (error) {
      console.error('Failed to load API config:', error)
    }
  }

  const saveApiConfig = async () => {
    try {
      const parsedConfig = {}
      for (const [provider, settings] of Object.entries(apiConfig)) {
        parsedConfig[provider] = JSON.parse(settings)
      }
      
      await db.setDefaultApiConfig(parsedConfig)
      alert('API配置保存成功')
    } catch (error) {
      alert('保存失败: ' + error.message)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })
      
      const data = await response.json()
      
      if (data.success && data.user.role === 'admin') {
        localStorage.setItem('auth_token', data.token)
        setUser(data.user)
        loadDashboardData()
        loadApiConfig()
      } else {
        alert('管理员登录失败')
      }
    } catch (error) {
      alert('网络错误')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  const updateApiConfig = (provider, field, value) => {
    setApiConfig(prev => ({
      ...prev,
      [provider]: JSON.stringify({
        ...JSON.parse(prev[provider] || '{}'),
        [field]: value
      })
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">管理员登录</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-white mb-2">邮箱</label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                className="w-full p-3 bg-gray-700 text-white rounded"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-white mb-2">密码</label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full p-3 bg-gray-700 text-white rounded"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded"
            >
              登录
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">管理员后台</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowApiConfig(!showApiConfig)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            {showApiConfig ? '隐藏' : '显示'} API配置
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            退出
          </button>
        </div>
      </header>

      {/* API配置面板 */}
      {showApiConfig && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">AI API配置</h2>
          <div className="space-y-6">
            {Object.entries(apiConfig).map(([provider, settings]) => {
              const parsedSettings = JSON.parse(settings || '{}')
              return (
                <div key={provider} className="border border-gray-700 p-4 rounded">
                  <h3 className="text-lg font-semibold mb-3 capitalize">{provider}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">API Key</label>
                      <input
                        type="password"
                        value={parsedSettings.apiKey || ''}
                        onChange={(e) => updateApiConfig(provider, 'apiKey', e.target.value)}
                        className="w-full p-2 bg-gray-700 text-white rounded text-sm"
                        placeholder="输入API Key"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm mb-1">启用</label>
                        <input
                          type="checkbox"
                          checked={parsedSettings.enabled || false}
                          onChange={(e) => updateApiConfig(provider, 'enabled', e.target.checked)}
                          className="mr-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">优先级</label>
                        <input
                          type="number"
                          value={parsedSettings.priority || 0}
                          onChange={(e) => updateApiConfig(provider, 'priority', parseInt(e.target.value))}
                          className="w-16 p-2 bg-gray-700 text-white rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <button
              onClick={saveApiConfig}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              保存配置
            </button>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">总用户数</h3>
          <p className="text-3xl font-bold text-blue-400">{stats.totalUsers || 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">总分析数</h3>
          <p className="text-3xl font-bold text-green-400">{stats.totalAnalyses || 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">今日分析</h3>
          <p className="text-3xl font-bold text-yellow-400">{stats.dailyAnalyses || 0}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">提供商统计</h3>
          <div className="text-sm space-y-1">
            {Object.entries(stats.providerStats).map(([provider, count]) => (
              <div key={provider} className="flex justify-between">
                <span className="capitalize">{provider}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 分析记录列表 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">分析记录</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2">ID</th>
                <th className="text-left py-2">用户ID</th>
                <th className="text-left py-2">类型</th>
                <th className="text-left py-2">AI提供商</th>
                <th className="text-left py-2">创建时间</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((analysis) => (
                <tr key={analysis.id} className="border-b border-gray-700">
                  <td className="py-2 text-sm">{analysis.id?.substring(0, 8)}...</td>
                  <td className="py-2 text-sm">{analysis.userId?.substring(0, 8)}...</td>
                  <td className="py-2">{analysis.type}</td>
                  <td className="py-2">{analysis.provider}</td>
                  <td className="py-2">{new Date(analysis.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    <button
                      onClick={() => alert(analysis.result)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm mr-2"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(analysis.result)}
                      className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                    >
                      复制
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 分页 */}
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => {
              setCurrentPage(Math.max(0, currentPage - 1))
              setTimeout(loadDashboardData, 100)
            }}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2 bg-gray-700 rounded">
            第 {currentPage + 1} 页
          </span>
          <button
            onClick={() => {
              setCurrentPage(currentPage + 1)
              setTimeout(loadDashboardData, 100)
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  )
}
