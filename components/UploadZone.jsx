'use client'
import { Upload, X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UploadZone({ images, setImages }) {
  const fileInputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).slice(0, 3 - images.length)
    processFiles(files)
  }

  const processFiles = (files) => {
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return toast.error('图片不能超过 5MB')
      const reader = new FileReader()
      reader.onload = ev => setImages(prev => [...prev, ev.target.result])
      reader.readAsDataURL(file)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-3xl p-8 border-2 border-dashed border-pastel-purple/40 hover:border-pastel-rose transition-all"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => fileInputRef.current.click()}
    >
      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => processFiles(Array.from(e.target.files))} />

      {images.length === 0 ? (
        <div className="h-80 flex flex-col items-center justify-center text-center cursor-pointer">
          <Upload className="w-16 h-16 text-pastel-purple mb-4" />
          <p className="text-2xl">拖拽或点击上传 1-3 张照片</p>
          <p className="text-sm text-muted-foreground mt-2">支持 JPG / PNG • 最大 5MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-2xl overflow-hidden">
              <img src={img} alt="" className="w-full aspect-square object-cover" />
              <button onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, idx) => idx !== i)) }} className="absolute top-3 right-3 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition">
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
