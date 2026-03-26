import { debounce } from './debounce';
import { prefs } from '$lib/stores/prefs';

const MIN_WIDTH = 240;

export function createPanelResize() {
	let panelEl: HTMLElement;
	let isDragging = false;
	let dragStartX = 0;
	let dragStartWidth = 0;

	const savePanelWidth = debounce((w: string) => {
		prefs.update((p) => ({ ...p, studyPanelWidth: w }));
	}, 200);

	function maxWidth(): number {
		return window.innerWidth * 0.5;
	}

	function setWidth(w: number) {
		const clamped = Math.min(Math.max(w, MIN_WIDTH), maxWidth());
		panelEl.style.width = `${clamped}px`;
		savePanelWidth(`${clamped}px`);
	}

	return {
		bindPanel(el: HTMLElement) {
			panelEl = el;
		},
		get isDragging() {
			return isDragging;
		},
		// Mouse
		onDividerMousedown(e: MouseEvent) {
			isDragging = true;
			dragStartX = e.clientX;
			dragStartWidth = panelEl.offsetWidth;
			e.preventDefault();
		},
		onMousemove(e: MouseEvent) {
			if (!isDragging) return;
			const delta = dragStartX - e.clientX;
			setWidth(dragStartWidth + delta);
		},
		onMouseup() {
			isDragging = false;
		},
		// Touch
		onTouchStart(e: TouchEvent) {
			isDragging = true;
			dragStartX = e.touches[0].clientX;
			dragStartWidth = panelEl.offsetWidth;
		},
		onTouchMove(e: TouchEvent) {
			if (!isDragging) return;
			const delta = dragStartX - e.touches[0].clientX;
			setWidth(dragStartWidth + delta);
		},
		onTouchEnd() {
			isDragging = false;
		},
		// Keyboard (arrow keys adjust by step)
		onKeydown(e: KeyboardEvent) {
			const step = e.shiftKey ? 48 : 16;
			if (e.key === 'ArrowLeft') {
				setWidth(panelEl.offsetWidth + step);
				e.preventDefault();
			} else if (e.key === 'ArrowRight') {
				setWidth(panelEl.offsetWidth - step);
				e.preventDefault();
			}
		}
	};
}
