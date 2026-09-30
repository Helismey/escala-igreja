import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #0F4C5C)',
        'on-primary': 'var(--color-on-primary, #FFFFFF)',
        ink: 'var(--color-ink, #22262B)',
        'ink-muted': 'var(--color-ink-muted, #596068)',
        bg: 'var(--color-bg, #F4F6F7)',
        surface: 'var(--color-surface, #FFFFFF)',
        line: 'var(--color-line, #DDE1E5)',
        'field-border': 'var(--color-field-border, #80868D)',
        success: 'var(--color-success, #1B6E45)',
        'success-soft': 'var(--color-success-soft, #E4F2EA)',
        'success-ink': 'var(--color-success-ink, #14532F)',
        danger: 'var(--color-danger, #B3261E)',
        'danger-soft': 'var(--color-danger-soft, #FCE8E6)',
        'danger-ink': 'var(--color-danger-ink, #8A1C16)',
        warning: 'var(--color-warning, #F2B632)',
        'warning-soft': 'var(--color-warning-soft, #FFF3D1)',
        'warning-ink': 'var(--color-warning-ink, #6A4700)',
        'info-soft': 'var(--color-info-soft, #E3EEF1)',
      },
      borderRadius: {
        control: 'var(--radius-control, 8px)',
        surface: 'var(--radius-surface, 14px)',
      },
      fontFamily: {
        display: ['var(--font-display, "Bricolage Grotesque")', 'system-ui', 'sans-serif'],
        body: ['var(--font-body, "Public Sans")', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
