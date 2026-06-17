import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react'

const ACCEPTED = { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] }

export default function DropZone({ onFile, file, preview, onClear }) {
  const [error, setError] = useState(null)

  const onDrop = useCallback((accepted, rejected) => {
    setError(null)
    if (rejected.length) {
      const e = rejected[0].errors[0]
      setError(e.code === 'file-too-large' ? 'Max 20 MB.' : 'JPG, PNG, WEBP, or GIF only.')
      return
    }
    if (accepted.length) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: 20 * 1024 * 1024, maxFiles: 1,
  })

  if (preview) {
    return (
      <div className="animate-fade-in">
        <div className="relative rounded-2xl overflow-hidden border border-accent/30 bg-card glow scan-wrap">
          <img src={preview} alt="preview" className="w-full max-h-72 object-contain bg-surface" />
          <button onClick={onClear}
            className="absolute top-3 right-3 w-8 h-8 bg-ink/70 backdrop-blur rounded-full flex items-center justify-center text-muted hover:text-white border border-border transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 px-1">
          <ImageIcon className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <span className="text-xs text-muted truncate">{file?.name}</span>
          <span className="text-xs text-muted/50 flex-shrink-0">
            ({(file?.size / 1024).toFixed(0)} KB)
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div {...getRootProps()} className={`
        rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 group
        ${isDragActive && !isDragReject ? 'border-accent bg-accent/5 scale-[1.01]'
          : isDragReject ? 'border-danger bg-danger/5'
          : 'border-border hover:border-accent/50 hover:bg-white/[0.02]'}
      `}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all
            ${isDragActive && !isDragReject ? 'bg-accent/20 scale-110' : 'bg-white/5 group-hover:bg-accent/10'}`}>
            <Upload className={`w-7 h-7 transition-colors ${isDragActive && !isDragReject ? 'text-accent' : 'text-muted group-hover:text-accent'}`} />
          </div>
          {isDragActive && !isDragReject ? (
            <p className="text-lg font-semibold text-accent">Drop to search</p>
          ) : isDragReject ? (
            <p className="text-lg font-semibold text-danger">Invalid file type</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-white">Drag & drop your image</p>
              <p className="text-sm text-muted mt-1.5 mb-5">or click to browse</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {['JPG', 'PNG', 'WEBP', 'GIF'].map(f => (
                  <span key={f} className="badge bg-white/5 text-muted border border-border">{f}</span>
                ))}
                <span className="badge bg-white/5 text-muted border border-border">Max 20 MB</span>
              </div>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 text-danger text-sm px-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
