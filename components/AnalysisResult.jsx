'use client'

import { motion } from 'framer-motion'
import { Sparkles, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

export default function AnalysisResult({ result, images }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(result)
    toast.success('分析结果已复制到剪贴板 🌸')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mt-16 glass rounded-3xl p-10 md:p-14"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Sparkles className="w-9 h-9 text-pastel-rose" />
          <h2 className="text-4xl font-semibold">你的内心宇宙画像</h2>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl hover:bg-white/70 dark:hover:bg-slate-700 transition"
        >
          <Copy size={20} />
          复制全文
        </button>
      </div>

      {/* 图片预览 */}
      <div className="flex gap-4 mb-10 overflow-x-auto pb-4">
        {images.map((img, i) => (
          <img 
            key={i} 
            src={img} 
            alt={`分析图片 ${i+1}`} 
            className="h-32 rounded-2xl object-cover shadow-md flex-shrink-0" 
          />
        ))}
      </div>

      {/* 分析结果内容 */}
      <div 
        className="prose prose-lg dark:prose-invert max-w-none leading-relaxed text-[17px]"
        dangerouslySetInnerHTML={{ __html: result }}
      />

      <div className="mt-10 text-center text-sm text-muted-foreground">
        愿这份分析带给你温柔与力量 🌷
      </div>
    </motion.div>
  )
}
