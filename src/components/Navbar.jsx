import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ScanSearch, Menu, X } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-ink/90 backdrop-blur-xl border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
            <ScanSearch className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold tracking-tight hidden sm:block">
            Image<span className="text-accent">Sim</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
