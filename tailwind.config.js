/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#2D5016', dark: '#1B3A0C', light: '#E8F0E0' },
        gold: { DEFAULT: '#D4A843', light: '#F5EDD8' },
        brown: { DEFAULT: '#6B4226' },
        charcoal: '#1A1A1A',
        stone: '#F2F2F2',
        predator: {
          wolf: '#B83230',
          lynx: '#D4760A',
          bear: '#7A4B1E',
          eagle: '#C9A800',
          wolverine: '#8B2500',
        },
        surface: { DEFAULT: '#161616', 2: '#1e1e1e', 3: '#282828' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
