/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF6EC', 100: '#FEE9D2', 200: '#FCD0A3', 300: '#F9B26B',
          400: '#F69C3F', 500: '#F28A1E', 600: '#D96F0E', 700: '#B4560D', 800: '#8F4512', 900: '#743A12',
        },
        navy: {
          50: '#EEF3FB', 100: '#D9E4F6', 200: '#B3C9EC', 300: '#82A5DE', 400: '#4F7BCB',
          500: '#2E5DB6', 600: '#1F4AA0', 700: '#1B3D82', 800: '#1A346A', 900: '#152A55', 950: '#0D1A36',
        },
        ink: { DEFAULT: '#1E2124', soft: '#4B5157', muted: '#7A8087' },
        kente: { gold: '#F4B400', green: '#0F9D58', red: '#D93025' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
        lift: '0 12px 32px -8px rgba(16,24,40,.18)',
      },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'slide-left': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'slide-up': 'slide-up .28s cubic-bezier(.22,1,.36,1)',
        'slide-left': 'slide-left .28s cubic-bezier(.22,1,.36,1)',
        'fade-in': 'fade-in .2s ease-out',
      },
    },
  },
  plugins: [],
};
