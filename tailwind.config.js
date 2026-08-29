/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: ['class', '[data-theme="dark"]'],
	theme: {
		extend: {
			colors: {
				background: 'var(--color-bg)',
				panel: 'var(--color-panel)',
				'panel-alt': 'var(--color-panel-alt, var(--color-panel))',
				foreground: 'var(--color-text)',
				muted: 'var(--color-muted)',
				subtle: 'var(--color-subtle)',
				interactive: 'var(--color-interactive)',
				accent: 'var(--color-accent)',
				border: 'var(--color-border)',
				glass: 'var(--color-bg-glass)'
			},
			fontFamily: {
				reader: 'var(--font-reader)',
				ui: 'var(--font-ui)'
			},
			// Metropolis reads slightly small at the default text-xs size —
			// nudge it up and open the letter-spacing a touch to compensate.
			fontSize: {
				xs: ['0.85rem', { lineHeight: '1.1rem', letterSpacing: '0.4px' }]
			},
			spacing: {
				xs: '8px',
				sm: '13px',
				md: '21px',
				lg: '34px',
				xl: '55px'
			}
		}
	}
};
