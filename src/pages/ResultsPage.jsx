import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, Database,
  TrendingDown, Image as ImageIcon, ExternalLink, Globe, Tag
} from 'lucide-react'

function PctRing({ pct }) {
  const r = 20, circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  const color = pct >= 95 ? '#EF4444' : pct >= 80 ? '#F5A623' : pct >= 60 ? '#4F8EF7' : '#6B7694'
  return (
    <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center"
      style={{ background: `${color}18`, borderRadius: '50%' }}>
      <svg width="48" height="48" viewBox="0 0 48 48"
        style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${circ-filled}`} strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-mono font-bold relative" style={{ color }}>{pct}%</span>
    </div>
  )
}

function typeBadge(type) {
  return {
    'exact':        { label: 'Exact Match',    cls: 'bg-danger/15  text-danger  border-danger/25'  },
    'near-exact':   { label: 'Near Exact',     cls: 'bg-warning/15 text-warning border-warning/25' },
    'partial':      { label: 'Partial Match',  cls: 'bg-accent/15  text-accent  border-accent/25'  },
    'page-exact':   { label: 'Page Match',     cls: 'bg-warning/15 text-warning border-warning/25' },
    'page-partial': { label: 'Page Similar',   cls: 'bg-accent/15  text-accent  border-accent/25'  },
    'similar':      { label: 'Similar',        cls: 'bg-accent/15  text-accent  border-accent/25'  },
    'visual':       { label: 'Visual Match',   cls: 'bg-muted/15   text-muted   border-muted/25'   },
  }[type] || { label: type, cls: 'bg-muted/15 text-muted border-muted/25' }
}

function sourceBadge(source) {
  return {
    'Your Database': 'bg-success/10 text-success border-success/20',
    'Google Vision': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'TinEye':        'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }[source] || 'bg-muted/10 text-muted border-muted/20'
}

function ResultCard({ result, rank }) {
  const [imgErr, setImgErr] = useState(false)
  const { label, cls } = typeBadge(result.match_type)
  const srcCls = sourceBadge(result.source)
  const displayUrl = result.page_url || result.url
  const domain = displayUrl ? (() => { try { return new URL(displayUrl).hostname } catch { return displayUrl } })() : null

  return (
    <div className="card p-4 animate-slide-up hover:border-accent/30 transition-all"
      style={{ animationDelay: `${rank * 40}ms`, animationFillMode: 'both' }}>
      <div className="flex gap-3 items-start">
        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-white/5 flex items-center justify-center mt-0.5">
          <span className="text-[10px] font-mono text-muted">#{rank+1}</span>
        </div>

        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-border bg-surface">
          {result.thumbnail && !imgErr ? (
            <img src={result.thumbnail} alt="" className="w-full h-full object-cover"
              onError={() => setImgErr(true)} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted/40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              {result.title && <p className="text-sm font-medium text-white truncate mb-0.5">{result.title}</p>}
              {domain && (
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-muted/60 flex-shrink-0" />
                  <span className="text-xs text-muted truncate">{domain}</span>
                </div>
              )}
            </div>
            <PctRing pct={result.similarity_pct} />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`badge border ${cls}`}>{label}</span>
            <span className={`badge border ${srcCls}`}>{result.source}</span>
            <span className="text-xs text-muted font-medium">{result.confidence} confidence</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {result.page_url && (
              <a href={result.page_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Globe className="w-3 h-3" /> View page
              </a>
            )}
            {result.url && result.url !== result.page_url && (
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors">
                <ExternalLink className="w-3 h-3" /> Image link
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { state } = useLocation()
  const navigate  = useNavigate()

  if (!state?.data) { navigate('/'); return null }

  const { data, queryPreview, fileName } = state
  const { results = [], total_in_database = 0, matches_found = 0,
          entities = [], bestGuessLabels = [], sources = {} } = data

  const exactCount = results.filter(r => r.match_type === 'exact').length
  const hasExact   = exactCount > 0
  const hasNear    = results.some(r => r.match_type === 'near-exact')

  const verdict = results.length === 0
    ? { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20',
        title: 'No Matches Found',
        desc: `This image appears to be unique across all sources checked.` }
    : hasExact
    ? { icon: XCircle, color: 'text-danger', bg: 'bg-danger/10 border-danger/20',
        title: `${exactCount} Exact Duplicate${exactCount > 1 ? 's' : ''} Found`,
        desc: 'This image already exists — found via database, Google Vision, or TinEye.' }
    : hasNear
    ? { icon: XCircle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20',
        title: 'Near-Exact Match Found',
        desc: 'A very similar version exists — possibly resized, compressed, or slightly edited.' }
    : { icon: Globe, color: 'text-accent', bg: 'bg-accent/10 border-accent/20',
        title: `${matches_found} Similar Result${matches_found > 1 ? 's' : ''} Found`,
        desc: 'Similar images were found across the web or in the database.' }

  const VIcon = verdict.icon

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors mb-8 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Check Another Image
        </button>

        <div className={`flex items-start gap-4 p-5 rounded-2xl border mb-8 animate-slide-up ${verdict.bg}`}>
          <VIcon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${verdict.color}`} />
          <div>
            <h2 className={`font-semibold text-base ${verdict.color}`}>{verdict.title}</h2>
            <p className="text-sm text-muted mt-0.5">{verdict.desc}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* Left sidebar */}
          <div className="lg:col-span-2 space-y-4">

            <div className="card p-4">
              <p className="text-xs text-muted uppercase tracking-wider font-medium mb-3">Uploaded Image</p>
              {queryPreview && (
                <div className="rounded-xl overflow-hidden border border-border bg-surface">
                  <img src={queryPreview} alt="query" className="w-full object-contain max-h-52" />
                </div>
              )}
              <p className="text-xs text-muted mt-2 truncate">{fileName}</p>
              <p className="text-xs text-success mt-1">✓ Saved to database</p>
            </div>

            <div className="card p-4 space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Sources Checked</p>
              {[
                { name: 'Your Database',  count: sources.database || 0, cls: 'text-success'      },
                { name: 'Google Vision',  count: sources.google   || 0, cls: 'text-blue-400'     },
                { name: 'TinEye (70B+)',  count: sources.tineye   || 0, cls: 'text-purple-400'   },
              ].map(({ name, count, cls }) => (
                <div key={name} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted">{name}</span>
                  <span className={`text-sm font-mono font-semibold ${cls}`}>{count} results</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-medium text-white">Total Matches</span>
                <span className="text-sm font-mono font-bold text-white">{results.length}</span>
              </div>
            </div>

            <div className="card p-4 space-y-2">
              <p className="text-xs text-muted uppercase tracking-wider font-medium mb-2">Match Breakdown</p>
              {[
                { label: 'Exact',        count: results.filter(r => r.match_type === 'exact').length,        color: 'text-danger'  },
                { label: 'Near-Exact',   count: results.filter(r => r.match_type === 'near-exact').length,   color: 'text-warning' },
                { label: 'Partial/Page', count: results.filter(r => r.match_type?.includes('partial') || r.match_type?.includes('page')).length, color: 'text-accent' },
                { label: 'Visual/Similar', count: results.filter(r => r.match_type === 'visual' || r.match_type === 'similar').length, color: 'text-muted' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm text-muted">{label}</span>
                  <span className={`text-sm font-mono font-semibold ${color}`}>{count}</span>
                </div>
              ))}
            </div>

            {(bestGuessLabels.length > 0 || entities.length > 0) && (
              <div className="card p-4">
                <p className="text-xs text-muted uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Google Identified
                </p>
                {bestGuessLabels.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted mb-1.5">Best guess</p>
                    <div className="flex flex-wrap gap-1.5">
                      {bestGuessLabels.map(l => (
                        <span key={l} className="badge bg-accent/10 text-accent border border-accent/20">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.slice(0, 5).map(e => (
                  <div key={e.description} className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white">{e.description}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent/60 rounded-full" style={{ width: `${e.score}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted">{e.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results list */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">
                {results.length > 0 ? `${results.length} Result${results.length > 1 ? 's' : ''} Found` : 'No Matches'}
              </h3>
              {results.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted">
                  <TrendingDown className="w-3.5 h-3.5" /> by similarity
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="card p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                <p className="font-semibold text-white text-lg mb-1">Unique Image</p>
                <p className="text-sm text-muted">No matches found across your database, Google Vision, or TinEye.</p>
              </div>
            ) : (
              results.map((r, i) => <ResultCard key={i} result={r} rank={i} />)
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
