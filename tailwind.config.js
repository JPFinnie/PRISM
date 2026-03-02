/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#EEF2FB',
          100: '#D9E2F5',
          600: '#2D4A8A',
          700: '#1E3470',
          800: '#132558',
          900: '#0B1A40',
        },
        gold: {
          400: '#E0B84A',
          500: '#C8973A',
          600: '#A87C2A',
        },
      },
    },
  },
  plugins: [],
};
