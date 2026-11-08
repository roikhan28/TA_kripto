/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#0D0F12',
          surface: '#16191E',
          card: '#1C2026',
          border: '#272B33',
          muted: '#8A94A6',
          accent: '#A3E635',       // Neon Lime primary
          accentHover: '#BEF264',
          accentDark: '#4D7C0F',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          cyan: '#06B6D4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
