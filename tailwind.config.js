/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neu-bg': '#e0e5ec',
        'neu-text': '#4a5568',
        'neu-heading': '#2d3748',
        'neu-primary': '#5a67d8',
        'neu-primary-hover': '#4c51bf',
        'neu-danger': '#e53e3e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neu': '9px 9px 16px rgba(163,177,198,0.5), -9px -9px 16px rgba(255,255,255,0.8)',
        'neu-hover': '12px 12px 20px rgba(163,177,198,0.6), -12px -12px 20px rgba(255,255,255,0.9)',
        'neu-inner': 'inset 6px 6px 10px 0 rgba(163,177,198,0.5), inset -6px -6px 10px 0 rgba(255,255,255,0.8)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
