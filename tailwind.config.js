/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#0B0F19',
          900: '#111827',
          850: '#161F33',
          800: '#1E293B',
        },
        healing: {
          mint: '#34D399',
          amber: '#FBBF24',
          lavender: '#A78BFA',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.45)',
        'glow-mint': '0 0 24px rgba(52, 211, 153, 0.35)',
        'glow-amber': '0 0 24px rgba(251, 191, 36, 0.35)',
        'glow-lavender': '0 0 24px rgba(167, 139, 250, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
