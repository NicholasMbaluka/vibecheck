/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      colors: {
        brand: {
          50:  '#fff1f4',
          100: '#ffe4ea',
          200: '#ffccd8',
          300: '#ffa0b8',
          400: '#ff6690',
          500: '#ff2d6b',
          600: '#f0134f',
          700: '#cc0940',
          800: '#a80b39',
          900: '#8e0d34',
        },
        surface: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#18181f',
          600: '#22222c',
          500: '#2d2d3a',
          400: '#3d3d4d',
        }
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,45,107,0.3)' },
          '50%':      { boxShadow: '0 0 40px rgba(255,45,107,0.7)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}
