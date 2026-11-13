import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#17181d',
        foreground: '#EAE6F0',
        surface: {
          50: '#2b2d35',
          100: '#202329',
          200: '#1b1d22',
          300: '#16171c',
        },
        border: 'rgba(178, 168, 196, 0.12)',
        accent: {
          DEFAULT: '#8E85A3',
          hover: '#7C7391',
          light: '#B3A9C9',
          soft: '#D0C8DF',
          deep: '#574E6B',
        },
        discord: {
          DEFAULT: '#5865F2',
          hover: '#4752c4',
          light: '#7983f5',
          green: '#57f287',
          yellow: '#fee75c',
          fuchsia: '#eb459e',
          red: '#ed4245',
        },
        mint: '#6FBF9B',
        amber: '#D9AE5F',
        rose: '#D97C86',
        muted: '#A29AAF',
        faint: '#7E768C',
      },
      fontFamily: {
        sans: [
          '"Segoe UI Variable Text"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"Cascadia Code"', '"Consolas"', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 2.8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
