<script lang="ts">
	/**
	 * The study panel's top-level tab row with its sliding underline.
	 *
	 * Renders nothing for a single tab, so callers can pass the visible-tab list
	 * unconditionally instead of guarding at the call site.
	 *
	 * Implements the ARIA tabs pattern with automatic activation: arrow keys move
	 * focus and select in one step. That is the recommended behaviour when
	 * selecting is cheap, and here it is two store writes with no fetch.
	 */
	import type { StudyTab } from '$lib/stores/studyPanel';
	import { activeTabIndex, studyTabId, type TabDef } from './studyPanelUtils';

	interface Props {
		tabs: TabDef[];
		activeTab: StudyTab;
		onSelect: (tab: StudyTab) => void;
		/** DOM id of the region these tabs control. */
		panelId: string;
	}

	let { tabs, activeTab, onSelect, panelId }: Props = $props();

	let tablistEl: HTMLDivElement | null = $state(null);
	let activeIndex = $derived(activeTabIndex(tabs, activeTab));

	function handleKeydown(e: KeyboardEvent) {
		if (tabs.length === 0) return;
		let next: number;
		switch (e.key) {
			case 'ArrowRight':
				next = (activeIndex + 1) % tabs.length;
				break;
			case 'ArrowLeft':
				next = (activeIndex - 1 + tabs.length) % tabs.length;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = tabs.length - 1;
				break;
			default:
				return;
		}
		e.preventDefault();
		onSelect(tabs[next].id);
		// The buttons are not re-created by a tab change, so they can be focused
		// straight away without waiting for a flush.
		tablistEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	}
</script>

{#if tabs.length > 1}
	<div
		class="tab-row relative flex px-[4px] gap-[2px]"
		role="tablist"
		aria-label="Study panel sections"
		bind:this={tablistEl}
	>
		{#each tabs as tab}
			<button
				role="tab"
				id={studyTabId(tab.id)}
				aria-selected={activeTab === tab.id}
				aria-controls={panelId}
				tabindex={activeTab === tab.id ? 0 : -1}
				class="tab-btn flex-1 pb-[9px] pt-[2px]"
				class:tab-active={activeTab === tab.id}
				onclick={() => onSelect(tab.id)}
				onkeydown={handleKeydown}
			>
				{tab.label}
			</button>
		{/each}
		<!-- Single sliding underline -->
		<div
			class="tab-slider"
			style="width: calc({100 / tabs.length}% - 4px); transform: translateX({activeIndex * 100}%)"
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
