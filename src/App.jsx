import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'

export default function App() {
  return (
    <div className="min-h-screen bg-ink dot-grid">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1E28', color: '#fff',
            border: '1px solid #252A38', borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#22D3A0', secondary: '#1A1E28' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#1A1E28' } },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </div>
  )
}
