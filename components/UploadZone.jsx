'use client'

import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function UploadZone({ images, setImages }) {
  const fileInputRef = useRef(null)

  const processFiles = (files) => {
    const newFiles = Array.from(files).slice(0, 3 - images.length)
    
    newFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过 5MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    processFiles(e.dataTransfer.files)
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-10 border-2 border-dashed border-pastel-purple/50 hover:border-pastel-rose transition-all cursor-pointer"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />

      {images.length === 0 ? (
        <div className="h-80 flex flex-col items-center justify-center text-center">
          <Upload className="w-20 h-20 text-pastel-purple mb-6" />
          <p className="text-3xl font-medium text-foreground">上传 1-3 张照片</p>
          <p className="text-muted-foreground mt-3 text-lg">拖拽到此处 或 点击上传</p>
          <p className="text-sm text-muted-foreground mt-6">支持 JPG、PNG • 最大 5MB/张</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {images.map((img, index) => (
            <div key={index} className="relative group rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={img} 
                alt={`上传图片 ${index + 1}`} 
                className="w-full aspect-square object-cover" 
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(index)
                }}
                className="absolute top-3 right-3 bg-white dark:bg-slate-800 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
              >
                <X className="w-5 h-5 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
