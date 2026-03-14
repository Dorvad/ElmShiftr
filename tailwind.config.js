/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f5f3ef',
          100: '#e8e3d8',
          200: '#d4ccba',
          300: '#b9ac96',
          400: '#9a8c74',
          500: '#7d7060',
          600: '#655a4d',
          700: '#4e453b',
          800: '#3a3229',
          900: '#27211a',
          950: '#161009',
        },
        ember: {
          400: '#f97316',
          500: '#ea580c',
          600: '#c2410c',
        },
        bone: '#f5f0e8',
        parchment: '#ede8dc',
      },
    },
  },
  plugins: [],
}
