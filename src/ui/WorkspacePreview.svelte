<script lang="ts">
	import { fileTypeMap, ViewGenerator } from 'interfaces/ViewGenerator';
	import { ExcalidrawViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Excalidraw';
	import { KanbanViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Kanban';
	import { MarkdownViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Markdown';
	import { NonMarkdownViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/NonMarkdown';

	import type { SearchMatches, TFile } from 'obsidian';
	import { onDestroy, onMount } from 'svelte';
	import { app } from './store';

	// props
	export let file: TFile;
	export let matches: SearchMatches;
	export let focusEl: HTMLElement;

	// bind
	let containerEl: HTMLElement | undefined;

	// internal variables
	let renderer: ViewGenerator | undefined;

	onMount(async () => {
		if (!containerEl) return;
		const fileType = fileTypeMap[file.extension];
		if (fileType !== undefined) {
			containerEl.empty();
			renderer = await new ViewGenerator($app, containerEl, file)
				.registerExtension(new ExcalidrawViewGeneratorExtension($app))
				.registerExtension(new KanbanViewGeneratorExtension($app))
				.registerExtension(new MarkdownViewGeneratorExtension())
				.registerExtension(new NonMarkdownViewGeneratorExtension())
				.load('source');
			highlightMatches(); // it should be called onMount
		}
		focusEl?.focus();
	});

	onDestroy(() => {
		setTimeout(() => renderer?.unload(), 1000);
	});

	function highlightMatches() {
		renderer?.highlightMatches(matches ?? [], 'highlight-search-match');
	}
</script>

<div class="content-container" bind:this={containerEl}>
	<div class="content-not-supported-file-format">
		{`${file.extension.toUpperCase()} file`}
	</div>
</div>

<style>
	.content-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: var(--layer-modal);
		/* pointer-events: none; to scroll */
		background-color: var(--background-primary);
		padding: 20px 30px;
		overflow: auto; /* show scroll bar */
	}

	.content-container :global(.highlight-search-match) {
		color: var(--highlight-search-match);
		background-color: var(--highlight-search-match-bg);
	}

	.content-container :global(.focus-search-match) {
		background-color: var(--focus-search-match-bg);
	}

	/*
		reset default styles
	*/
	.content-container :global(.workspace-leaf) {
		contain: initial !important;
	}

	.content-container :global(.workspace-leaf-resize-handle) {
		display: none;
	}

	.content-container :global(.view-header) {
		display: none;
	}

	.content-container :global(.markdown-preview-view) {
		padding: 0;
	}

	.content-container :global(.modal-content) {
		margin: 0;
	}

	.content-container :global(.markdown-source-view.mod-cm6 .cm-editor) {
		flex: initial; /* overwrite "flex: 1 1 0" */
		display: initial; /* overwrite "display: flex" */
	}

	.content-container :global(.markdown-source-view.mod-cm6) {
		display: initial; /* overwrite "display: flex" */
	}

	.content-container :global(.markdown-source-view) {
		pointer-events: none;
	}

	.content-container :global(.markdown-source-view.mod-cm6 .cm-scroller) {
		padding: 0;
	}
</style>
