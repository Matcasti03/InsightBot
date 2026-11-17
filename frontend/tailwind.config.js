/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'rgb(var(--app) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        main: 'rgb(var(--main) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-soft': 'rgb(var(--primary-soft) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 18px 45px -28px rgba(2, 132, 199, 0.35)',
        glow: '0 0 35px -8px rgba(56, 189, 248, 0.55)'
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        scan: 'scan 4s linear infinite',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite'
      }
    }
  },
  plugins: []
};
