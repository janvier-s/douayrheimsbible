/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        panel: 'var(--color-panel)',
        foreground: 'var(--color-text)',
        muted: 'var(--color-muted)',
        interactive: 'var(--color-interactive)',
        border: 'var(--color-border)'
      },
      fontFamily: {
        reader: 'var(--font-reader)',
        ui: 'var(--font-ui)'
      },
      spacing: {
        xs: '8px', sm: '13px', md: '21px',
        lg: '34px', xl: '55px', '2xl': '89px'
      }
    }
  }
};
