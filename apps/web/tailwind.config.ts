import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
    './shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        srs: {
          again: 'var(--srs-again)',
          hard: 'var(--srs-hard)',
          good: 'var(--srs-good)',
          easy: 'var(--srs-easy)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-jp)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        jp: ['var(--font-jp)', 'ui-sans-serif', 'sans-serif'],
      },
      // Radius scale (DESIGN.md "Spacing, radius & shadow scale"). Deliberately
      // larger than the old flat 8px-everywhere default — 10px inputs/buttons,
      // 14px cards/modals, 20px reserved for large hero-ish surfaces (auth
      // split panel) — so surfaces read as distinct elevation tiers instead of
      // one uniform rounded-rect. `full` is for pills/avatars/badges.
      borderRadius: {
        sm: '0.375rem', // 6px  — chips, small controls
        DEFAULT: '0.625rem', // 10px — buttons, inputs, dropdowns
        md: '0.625rem',
        lg: '0.875rem', // 14px — cards, panels, modals
        xl: '1.25rem', // 20px — large feature/hero surfaces
      },
      // Shadow scale (DESIGN.md). Tinted toward the brand ink (#16162b) instead
      // of pure black so elevation reads as "lifted paper," not a generic
      // browser default. Dark mode leans on the `border` + `card` step-up
      // instead of visible shadow (box-shadow barely reads on dark surfaces) —
      // these tokens still apply in dark mode for consistency but are
      // intentionally subtle there.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(22 22 43 / 0.04)',
        sm: '0 1px 3px 0 rgb(22 22 43 / 0.06), 0 1px 2px -1px rgb(22 22 43 / 0.04)',
        DEFAULT: '0 1px 3px 0 rgb(22 22 43 / 0.06), 0 1px 2px -1px rgb(22 22 43 / 0.04)',
        md: '0 4px 8px -2px rgb(22 22 43 / 0.08), 0 2px 4px -2px rgb(22 22 43 / 0.04)',
        lg: '0 12px 24px -4px rgb(22 22 43 / 0.10), 0 4px 8px -4px rgb(22 22 43 / 0.04)',
        xl: '0 24px 48px -8px rgb(22 22 43 / 0.14), 0 8px 16px -8px rgb(22 22 43 / 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;
