/**
 * Tailwind CSS Configuration for OMEGA UI
 * @module tailwind.config
 * @description Design system configuration following OMEGA standards
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        omega: {
          bg: '#0a0a0f',
          surface: '#14141f',
          border: '#2a2a3f',
          text: '#e0e0e8',
          muted: '#8080a0',
          primary: '#6366f1',
          'primary-hover': '#818cf8',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
