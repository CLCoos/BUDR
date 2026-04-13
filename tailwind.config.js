/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  safelist: [
    { pattern: /^(bg|text|border)-(midnight|sunrise|aurora)-[a-z0-9-]+(\/[0-9]+)?$/ },
    /* `gradient-midnight` er @layer utility i `src/styles/tailwind.css` — ikke en JIT-klasse; safelist-pattern matchede aldrig. */
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        budr: {
          lavender: '#F5F4FF',
          purple: '#7F77DD',
          'purple-dark': '#5E56C0',
          navy: '#0F1B2D',
          teal: '#1D9E75',
          'teal-light': '#E6F7F2',
          groen: '#22C55E',
          gul: '#EAB308',
          roed: '#EF4444',
        },
        // BUDR 2.0 color palette (resident-facing app)
        midnight: {
          50: 'hsl(240, 40%, 97%)',
          100: 'hsl(240, 35%, 93%)',
          200: 'hsl(238, 30%, 85%)',
          300: 'hsl(236, 28%, 70%)',
          400: 'hsl(234, 35%, 55%)',
          500: 'hsl(232, 45%, 40%)',
          600: 'hsl(230, 55%, 28%)',
          700: 'hsl(228, 60%, 20%)',
          800: 'hsl(226, 65%, 14%)',
          900: 'hsl(224, 70%, 9%)',
          950: 'hsl(222, 75%, 6%)',
        },
        sunrise: {
          50: 'hsl(35, 100%, 97%)',
          100: 'hsl(35, 95%, 92%)',
          200: 'hsl(33, 90%, 82%)',
          300: 'hsl(30, 88%, 70%)',
          400: 'hsl(27, 92%, 60%)',
          500: 'hsl(24, 95%, 52%)',
          600: 'hsl(20, 90%, 44%)',
        },
        aurora: {
          pink: 'hsl(320, 70%, 65%)',
          violet: 'hsl(270, 65%, 65%)',
          blue: 'hsl(210, 80%, 65%)',
          teal: 'hsl(175, 70%, 50%)',
          green: 'hsl(145, 65%, 55%)',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        sunrise: '0 4px 24px rgba(251, 146, 60, 0.25)',
        'sunrise-lg': '0 8px 40px rgba(251, 146, 60, 0.35)',
        aurora: '0 4px 32px rgba(167, 139, 250, 0.3)',
        glow: '0 0 40px rgba(251, 146, 60, 0.2)',
        'glow-violet': '0 0 40px rgba(167, 139, 250, 0.25)',
        'soft-dark': '0 2px 20px rgba(0, 0, 0, 0.4)',
        'card-dark': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        waveform: 'waveform 0.8s ease-in-out infinite alternate',
        breathe: 'breathe 4s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
        orbit: 'orbit 8s linear infinite',
        'orbit-reverse': 'orbit 12s linear infinite reverse',
        float: 'float 3s ease-in-out infinite',
        'float-slow': 'float 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'river-flow': 'river-flow 8s linear infinite',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'slide-down': 'slide-down 0.4s ease-out forwards',
        'pop-in': 'pop-in 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'pulse-warm': 'pulse-warm 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        waveform: {
          from: { height: '4px' },
          to: { height: '24px' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.12)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251, 146, 60, 0.3)' },
          '50%': { boxShadow: '0 0 50px rgba(251, 146, 60, 0.6)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(70px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(70px) rotate(-360deg)' },
        },
        'river-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-warm': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};