/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Outfit"', 'sans-serif']
      },
      colors: {
      },
      borderRadius: {
        xl: '1.25rem'
      }
    }
  },
  plugins: []
};
