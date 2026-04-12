'use client'
import { motion } from 'framer-motion'
import { Sparkles, Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function AnalysisResult({ result, images }) {
  const copyResult = () => {
    navigator.clipboard.writeText(result)
    toast.success('已复制到剪贴板 🌸')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mt-16 glass rounded-3xl p-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold flex items-center gap-2"><Sparkles className="text-pastel-rose" /> 你的内心画像</h2>
        <button onClick={copyResult} className="flex items-center gap-1 text-sm hover:text-pastel-rose"><Copy size={16} /> 复制</button>
      </div>
      <div className="prose dark:prose-invert max-w-none leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: result }} />
    </motion.div>
  )
}
