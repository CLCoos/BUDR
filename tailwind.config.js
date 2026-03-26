/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
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
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        waveform: 'waveform 0.8s ease-in-out infinite alternate',
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
      },
    },
  },
  plugins: [],
};