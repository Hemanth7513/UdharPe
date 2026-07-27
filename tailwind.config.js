/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neu-bg': '#FEF9C3',       /* Very light yellow background */
        'neu-text': '#1D4ED8',      /* Bright Blue text */
        'neu-heading': '#059669',   /* Vivid Green heading */
        'neu-primary': '#F59E0B',   /* Vibrant Amber/Orange */
        'neu-primary-hover': '#D97706', /* Slightly darker amber for hover */
        'neu-danger': '#EF4444',    /* Bright Red */
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'neu': '6px 6px 0px 0px #3B82F6', /* Electric Blue shadow */
        'neu-hover': '8px 8px 0px 0px #3B82F6',
        'neu-inner': '4px 4px 0px 0px #3B82F6',
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
