/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bice-blue': '#326295',
        'bice-gray': '#65646A',
        'bice-green': '#84BD00',
        'bice-dark-blue': '#003a70',
        'bice-light-blue': '#00abc8',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
