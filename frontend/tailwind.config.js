/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070C1E',
          900: '#0B132B',
          800: '#1C2541',
          700: '#2A365C',
        },
        cyber: {
          blue: '#3A86FF',
          green: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          slate: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
