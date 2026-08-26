<script lang="ts">
	/**
	 * The study panel's top-level tab row with its sliding underline.
	 *
	 * Renders nothing for a single tab, so callers can pass the visible-tab list
	 * unconditionally instead of guarding at the call site.
	 */
	import type { StudyTab } from '$lib/stores/studyPanel';
	import type { TabDef } from './studyPanelUtils';

	interface Props {
		tabs: TabDef[];
		activeTab: StudyTab;
		onSelect: (tab: StudyTab) => void;
	}

	let { tabs, activeTab, onSelect }: Props = $props();

	// Falls back to 0 while a tab switch is mid-flight and the active tab is not
	// yet in the list, which keeps the underline from flying off to -100%.
	let sliderIndex = $derived(
		Math.max(
			0,
			tabs.findIndex((t) => t.id === activeTab)
		)
	);
</script>

{#if tabs.length > 1}
	<div
		class="tab-row relative flex px-[4px] gap-[2px]"
		role="tablist"
		aria-label="Study panel sections"
	>
		{#each tabs as tab}
			<button
				role="tab"
				aria-selected={activeTab === tab.id}
				class="tab-btn flex-1 pb-[9px] pt-[2px]"
				class:tab-active={activeTab === tab.id}
				onclick={() => onSelect(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
		<!-- Single sliding underline -->
		<div
			class="tab-slider"
			style="width: calc({100 / tabs.length}% - 4px); transform: translateX({sliderIndex * 100}%)"
			aria-hidden="true"
		></div>
	</div>
{/if}

<style>
	.tab-row {
		position: relative;
	}

	.tab-btn {
		font-size: 12px;
		font-weight: 400;
		color: var(--color-subtle);
		background: none;
		border: none;
		cursor: pointer;
		letter-spacing: 0.02em;
		transition: color var(--duration-fast);
		font-family: var(--font-ui);
	}

	.tab-btn:hover {
		color: var(--color-text);
	}

	.tab-active {
		color: var(--color-accent);
	}

	.tab-slider {
		position: absolute;
		bottom: 0;
		left: 4px;
		height: 2px;
		border-radius: 1px 1px 0 0;
		background: var(--color-accent);
		transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		.tab-slider {
			transition: none;
		}
	}
</style>
