import { parseOsis, type OsisRange } from '$lib/search/osis';

/**
 * Hover state for `<a class="verse-ref" data-osis="...">` links rendered inside
 * `{@html}` commentary, driving a `<VerseTooltip>`.
 *
 * StudyPanel and FathersCommentaryPanel both linkify notes the same way and had
 * character-identical copies of this logic. The two dismiss delays are
 * deliberate: leaving the reference itself gives a generous grace period so the
 * pointer can travel to the tooltip, while leaving the tooltip closes briskly.
 *
 * Usage:
 *
 *   const tip = createVerseRefTooltip();
 *   onDestroy(tip.destroy);
 *
 *   <div onmouseover={tip.handleOver} onmouseout={tip.handleOut}>...</div>
 *   <VerseTooltip osisRanges={tip.refs} anchorEl={tip.anchor} visible={tip.visible}
 *                 onmouseenter={tip.cancelDismiss} onmouseleave={tip.scheduleDismiss} />
 */
export function createVerseRefTooltip(
	options: { refDelayMs?: number; tooltipDelayMs?: number } = {}
) {
	const { refDelayMs = 300, tooltipDelayMs = 120 } = options;

	let refs: OsisRange[] = $state([]);
	let anchor: HTMLElement | null = $state(null);
	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function clear() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function dismissAfter(ms: number) {
		clear();
		timer = setTimeout(() => {
			visible = false;
			anchor = null;
			timer = null;
		}, ms);
	}

	return {
		get refs() {
			return refs;
		},
		get anchor() {
			return anchor;
		},
		get visible() {
			return visible;
		},

		/** Pointer entered something inside the commentary body. */
		handleOver(e: Event) {
			const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
			if (!vref) return;
			clear();
			const parsed = (vref.dataset.osis ?? '').split(',').flatMap((s) => {
				const r = parseOsis(s.trim());
				return r ? [r] : [];
			});
			if (parsed.length > 0) {
				refs = parsed;
				anchor = vref;
				visible = true;
			}
		},

		/** Pointer left a reference. Ignored when it moved onto the tooltip. */
		handleOut(e: Event) {
			const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
			if (related?.closest?.('.tooltip')) return;
			const vref = (e.target as HTMLElement).closest('.verse-ref') as HTMLElement | null;
			if (vref) dismissAfter(refDelayMs);
		},

		/** Pointer entered the tooltip itself: keep it open. */
		cancelDismiss: clear,

		/** Pointer left the tooltip: close it briskly. */
		scheduleDismiss() {
			dismissAfter(tooltipDelayMs);
		},

		destroy: clear
	};
}
