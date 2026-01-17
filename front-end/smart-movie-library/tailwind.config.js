// tailwind.config.js
// Replace your existing tailwind.config.js with this file

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'tmdb-dark': '#0d1117',
        'tmdb-dark-blue': '#032541',
        'tmdb-light-blue': '#01b4e4',
        'tmdb-light-green': '#90cea1',
        'tmdb-yellow': '#d2d531',
        'tmdb-red': '#db2360',
      },
      fontFamily: {
        sans: ['Source Sans Pro', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}