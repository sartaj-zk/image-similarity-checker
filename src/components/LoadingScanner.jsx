import React from 'react'
import { ScanSearch } from 'lucide-react'

const STEPS = [
  { label: 'Uploading image…',                    pct: 20 },
  { label: 'Computing perceptual hash…',           pct: 40 },
  { label: 'Fetching database images…',            pct: 60 },
  { label: 'Comparing against all uploads…',       pct: 80 },
  { label: 'Ranking results…',                     pct: 96 },
]

export default function LoadingScanner({ stage = 0 }) {
  const step = STEPS[Math.min(stage, STEPS.length - 1)]
  return (
    <div className="flex flex-col items-center py-14 gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <ScanSearch className="w-9 h-9 text-accent" />
        </div>
        <div className="absolute w-2.5 h-2.5 rounded-full bg-accent top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ animation: 'orbit 1.2s linear infinite' }} />
      </div>

      <div className="w-full max-w-xs text-center">
        <p className="text-sm text-muted mb-3 font-mono min-h-[1.25rem]">{step.label}</p>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${step.pct}%` }} />
        </div>
        <p className="text-xs text-muted/40 mt-1.5 font-mono">{step.pct}%</p>
      </div>

      <p className="text-xs text-muted/50 max-w-xs text-center leading-relaxed">
        Using perceptual hashing to detect exact duplicates, resized,
        compressed, and edited versions of your image
      </p>
    </div>
  )
}
