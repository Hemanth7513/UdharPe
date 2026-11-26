/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neu-bg': '#f4f4f5',
        'neu-text': '#52525b',
        'neu-heading': '#18181b',
        'neu-primary': '#18181b',
        'neu-primary-hover': '#27272a',
        'neu-danger': '#dc2626',
        'neu-success': '#15803d',
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', '"Noto Sans Tamil"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Space Grotesk"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', '"Noto Sans Tamil"', 'sans-serif'],
      },
      boxShadow: {
        'neu': '0 1px 2px 0 rgba(24, 24, 27, 0.04)',
        'neu-hover': '0 4px 12px -2px rgba(24, 24, 27, 0.08)',
        'neu-inner': 'inset 0 1px 2px 0 rgba(24, 24, 27, 0.04)',
        'elevated': '0 16px 32px -8px rgba(24, 24, 27, 0.12)',
      },
    },
  },
  plugins: [],
}
