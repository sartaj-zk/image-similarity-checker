/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:     '#0D0F14',
        surface: '#13161D',
        card:    '#1A1E28',
        border:  '#252A38',
        accent:  '#4F8EF7',
        muted:   '#6B7694',
        success: '#22D3A0',
        warning: '#F5A623',
        danger:  '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        spin:    { to: { transform: 'rotate(360deg)' } },
        orbit: {
          from: { transform: 'rotate(0deg) translateX(36px)' },
          to:   { transform: 'rotate(360deg) translateX(36px)' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.35s ease-out both',
        'fade-in':  'fadeIn 0.3s ease-out both',
        orbit:      'orbit 1.2s linear infinite',
      },
    },
  },
  plugins: [],
}
