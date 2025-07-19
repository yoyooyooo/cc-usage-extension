import type { Config } from 'tailwindcss';

export default {
  content: [
    'entrypoints/**/*.{ts,tsx,html}',
    'components/**/*.{ts,tsx}',
    'public/**/*.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;