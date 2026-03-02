import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/globals.css',
    './public/index.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
