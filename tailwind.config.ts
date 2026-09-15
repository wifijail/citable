import type { Config } from 'tailwindcss';

/** Colors resolve to CSS variables, so every utility follows the active theme. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.25rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        bg: token('bg'),
        subtle: token('bg-subtle'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('border'),
        'line-strong': token('border-strong'),
        fg: token('fg'),
        muted: token('fg-muted'),
        faint: token('fg-subtle'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
        'accent-fg': token('accent-fg'),
        mint: token('mint'),
        pass: token('pass'),
        warn: token('warn'),
        fail: token('fail'),
        info: token('info'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 0 0 rgb(var(--fg) / 0.03), 0 8px 24px -12px rgb(var(--fg) / 0.12)',
      },
      keyframes: {
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'cube-spin': {
          from: { transform: 'rotateX(-24deg) rotateY(0deg)' },
          to: { transform: 'rotateX(-24deg) rotateY(360deg)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 8s linear infinite',
        'cube-spin': 'cube-spin 9s linear infinite',
        // CSS-only entrance: runs before (and without) JavaScript, unlike motion's initial state.
        'fade-up': 'fade-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
