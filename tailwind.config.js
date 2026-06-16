/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: 'rgba(5, 10, 20, 0.75)',
          border: 'rgba(56, 189, 248, 0.15)',
          accent: '#38bdf8',
          accentHover: '#7dd3fc',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      }
    },
  },
  plugins: [],
}