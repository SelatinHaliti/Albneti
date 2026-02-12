import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e0f1ff',
          100: '#b3dfff',
          200: '#80caff',
          300: '#4db5ff',
          400: '#1a9fff',
          500: '#0095f6',
          600: '#0077cc',
          700: '#005a99',
          800: '#003d66',
          900: '#002033',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        card: '0 10px 40px -10px rgba(225, 48, 108, 0.12), 0 4px 20px -4px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 10px 40px -10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.03)',
        glow: '0 0 60px -12px rgba(225, 48, 108, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
