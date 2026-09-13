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
        glow: '0 0 0 1px rgb(var(--accent) / 0.35), 0 12px 40px -8px rgb(var(--accent) / 0.45)',
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(6%,-4%,0) scale(1.08)' },
          '66%': { transform: 'translate3d(-5%,5%,0) scale(0.96)' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'cube-spin': {
          from: { transform: 'rotateX(-24deg) rotateY(0deg)' },
          to: { transform: 'rotateX(-24deg) rotateY(360deg)' },
        },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)', filter: 'blur(6px)' },
          to: { opacity: '1', transform: 'none', filter: 'none' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        aurora: 'aurora 22s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'cube-spin': 'cube-spin 9s linear infinite',
        float: 'float 6s ease-in-out infinite',
        // CSS-only entrance: runs before (and without) JavaScript, unlike motion's initial state.
        'fade-up': 'fade-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
