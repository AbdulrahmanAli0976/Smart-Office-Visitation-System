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
        clay: {
          50: '#f7f4f0',
          100: '#efe7df',
          200: '#e4d6c7',
          300: '#d5c2ab',
          400: '#c2a98f',
          500: '#ad9074',
          600: '#92725b',
          700: '#745644',
          800: '#5b4435',
          900: '#46342a'
        }
      },
      boxShadow: {
        clay: '12px 12px 24px rgba(122, 98, 82, 0.25), -8px -8px 18px rgba(255, 255, 255, 0.8)'
      },
      borderRadius: {
        xl: '1.25rem'
      }
    }
  },
  plugins: []
};
