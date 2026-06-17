import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanSearch, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import DropZone from '../components/DropZone'
import LoadingScanner from '../components/LoadingScanner'
import { searchImage } from '../utils/api'

export default function HomePage() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const stageRef = useRef(null)
  const previewRef = useRef(null)

  function handleFile(f) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(f)
    previewRef.current = url
    setFile(f); setPreview(url)
  }

  function handleClear() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setFile(null); setPreview(null)
  }

  async function handleSearch() {
    if (!file) { toast.error('Please select an image first'); return }
    setLoading(true); setStage(0)
    let s = 0
    stageRef.current = setInterval(() => { s = Math.min(s + 1, 4); setStage(s) }, 1500)
    try {
      const data = await searchImage(file)
      clearInterval(stageRef.current)
      navigate('/results', { state: { data, queryPreview: preview, fileName: file.name } })
    } catch (err) {
      clearInterval(stageRef.current)
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
            Check If Your Image<br />
            <span className="text-accent">Already Exists</span>
          </h1>
          <p className="text-lg text-muted max-w-lg mx-auto">
            Upload an image to instantly find exact matches and similar versions.
          </p>
        </div>

        <div className="card p-6 glow animate-slide-up">
          {loading ? (
            <LoadingScanner stage={stage} />
          ) : (
            <>
              <DropZone onFile={handleFile} file={file} preview={preview} onClear={handleClear} />
              <div className="mt-5 flex gap-3">
                <button onClick={handleSearch} disabled={!file}
                  className="btn-primary flex-1 justify-center py-3.5 text-base">
                  <ScanSearch className="w-5 h-5" />
                  Check for Duplicates
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
                {file && <button onClick={handleClear} className="btn-ghost py-3.5">Clear</button>}
              </div>
            </>
          )}
        </div>

      </div>
    </main>
  )
}
