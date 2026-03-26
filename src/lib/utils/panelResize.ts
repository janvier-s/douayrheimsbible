import { debounce } from './debounce';
import { prefs } from '$lib/stores/prefs';

export function createPanelResize() {
	let panelEl: HTMLElement;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartWidth = 0;

	const savePanelWidth = debounce((w: string) => {
		prefs.update((p) => ({ ...p, studyPanelWidth: w }));
	}, 200);

	return {
		bindPanel(el: HTMLElement) {
			panelEl = el;
		},
		get isDragging() {
			return isDragging;
		},
		onDividerMousedown(e: MouseEvent) {
			isDragging = true;
			dragStartX = e.clientX;
			dragStartWidth = panelEl.offsetWidth;
			e.preventDefault();
		},
		onMousemove(e: MouseEvent) {
			if (!isDragging) return;
			const delta = dragStartX - e.clientX;
			const newWidth = Math.min(Math.max(dragStartWidth + delta, 240), window.innerWidth * 0.5);
			panelEl.style.width = `${newWidth}px`;
			savePanelWidth(`${newWidth}px`);
		},
		onMouseup() {
			isDragging = false;
		}
	};
}
