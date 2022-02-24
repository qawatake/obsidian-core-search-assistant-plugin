<script lang="ts">
	import { onMount } from 'svelte';

	// props
	export let lineWidth: number;

	// bind
	let el: HTMLElement | undefined;

	onMount(() => {
		if (!el) return;
		el.style.outline = `${lineWidth}px solid var(${STYLE_VAR_COLOR_SEARCH_MODE_OUTLINE})`;
		el.style.outlineOffset = `-${lineWidth}px`;
	});

	const STYLE_VAR_COLOR_SEARCH_MODE_OUTLINE = '--search-mode-outline';
</script>

<div class="outline-container" bind:this={el} />

<style>
	.outline-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: var(--layer-modal);
		pointer-events: none;
	}
</style>
