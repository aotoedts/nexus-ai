/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0a12',
          900: '#12121c',
          800: '#191926',
          700: '#232336',
        },
        nexus: {
          50: '#f3f1ff',
          100: '#ebe5ff',
          400: '#8b6cf2',
          500: '#7c4dff',
          600: '#6c2fff',
          900: '#241a4d',
        },
        signal: {
          400: '#4ee6c4',
          500: '#2fd1af',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
