import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        panel: '#14171c',
        border: '#232830',
        fg: '#e6e8eb',
        muted: '#8a8f98',
      },
    },
  },
  plugins: [],
};

export default config;
