import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

/**
 * Savewise design system.
 *
 * Every colour is an HSL triplet held in a CSS custom property (see
 * `src/styles/theme.css`) rather than a literal here. That is what makes the
 * light and dark themes two *designed* palettes swapped at the root, instead of
 * one palette inverted — a dark theme built by inverting a light one always
 * ends up with muddy greens and shadows that do not read.
 *
 * The `<alpha-value>` placeholder keeps Tailwind's opacity modifiers working:
 * `bg-primary/10` still resolves correctly through the variable.
 */

const withAlpha = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces, from furthest back to closest to the reader.
        canvas: withAlpha('--canvas'),
        surface: withAlpha('--surface'),
        'surface-raised': withAlpha('--surface-raised'),
        'surface-sunken': withAlpha('--surface-sunken'),

        border: withAlpha('--border'),
        'border-strong': withAlpha('--border-strong'),
        ring: withAlpha('--ring'),

        ink: withAlpha('--ink'),
        'ink-muted': withAlpha('--ink-muted'),
        'ink-subtle': withAlpha('--ink-subtle'),
        'ink-inverse': withAlpha('--ink-inverse'),

        // Evergreen — the brand. Money that is being looked after.
        primary: {
          DEFAULT: withAlpha('--primary'),
          hover: withAlpha('--primary-hover'),
          soft: withAlpha('--primary-soft'),
          contrast: withAlpha('--primary-contrast'),
        },

        // Clay — used sparingly, for the one thing that matters on a screen.
        accent: {
          DEFAULT: withAlpha('--accent'),
          soft: withAlpha('--accent-soft'),
          contrast: withAlpha('--accent-contrast'),
        },

        // Semantic states. Never the only signal — always paired with an icon
        // or a label, so the meaning survives a colour-vision difference.
        positive: { DEFAULT: withAlpha('--positive'), soft: withAlpha('--positive-soft') },
        warning: { DEFAULT: withAlpha('--warning'), soft: withAlpha('--warning-soft') },
        critical: { DEFAULT: withAlpha('--critical'), soft: withAlpha('--critical-soft') },
        info: { DEFAULT: withAlpha('--info'), soft: withAlpha('--info-soft') },
      },

      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // A restrained scale. Financial interfaces get noisy fast; five text
        // sizes and four display sizes are enough for the whole product.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.375rem', { lineHeight: '2.625rem', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '3.125rem', letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem', { lineHeight: '3.875rem', letterSpacing: '-0.035em' }],
        '7xl': ['4.75rem', { lineHeight: '4.75rem', letterSpacing: '-0.04em' }],
      },

      borderRadius: {
        // Two radii, used consistently: `lg` for controls, `xl`/`2xl` for
        // surfaces. Mixing five radii is what makes an interface look assembled
        // rather than designed.
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },

      boxShadow: {
        // Soft, low-contrast elevation. Financial UI should feel settled, not
        // floating; heavy drop shadows read as a template.
        xs: '0 1px 2px 0 hsl(var(--shadow) / 0.05)',
        sm: '0 1px 3px 0 hsl(var(--shadow) / 0.07), 0 1px 2px -1px hsl(var(--shadow) / 0.05)',
        md: '0 4px 12px -2px hsl(var(--shadow) / 0.08), 0 2px 4px -2px hsl(var(--shadow) / 0.05)',
        lg: '0 12px 28px -6px hsl(var(--shadow) / 0.12), 0 4px 10px -4px hsl(var(--shadow) / 0.06)',
        xl: '0 24px 48px -12px hsl(var(--shadow) / 0.18)',
        focus: '0 0 0 3px hsl(var(--ring) / 0.35)',
      },

      spacing: {
        // Layout constants, named so they stay in step across every page.
        header: '4rem',
        sidebar: '16rem',
        'sidebar-collapsed': '4.5rem',
      },

      maxWidth: {
        prose: '68ch',
        content: '80rem',
      },

      transitionTimingFunction: {
        // One easing curve for the entire product. Motion reads as a system
        // when everything decelerates the same way.
        swift: 'cubic-bezier(0.16, 1, 0.3, 1)',
        entrance: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'draw-line': {
          from: { strokeDashoffset: '1000' },
          to: { strokeDashoffset: '0' },
        },
      },

      animation: {
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [typography],
} satisfies Config;
