/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2EFE6',
          100: '#E3DECA',
          200: '#C6CCC2',
          300: '#AB9D70',
          500: '#77734E',
          600: '#5E6240',
          700: '#454E32',
          900: '#27331D',
        }
      }
    },
  },
  plugins: [],
}
