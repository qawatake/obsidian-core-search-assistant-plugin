<script lang="ts">
import { fileTypeMap, ViewGenerator } from "interfaces/ViewGenerator";
import { ExcalidrawViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Excalidraw";
import { KanbanViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Kanban";
import { MarkdownViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Markdown";
import { NonMarkdownViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/NonMarkdown";
import type { SearchMatches, TFile } from "obsidian";
import { onDestroy, onMount } from "svelte";
import { app } from "./store";

// props
export let file: TFile | undefined;
export let matches: SearchMatches | undefined;

// bind
let contentContainerEl: HTMLElement | undefined;

// internal variables
let renderer: ViewGenerator | undefined;

onMount(async () => {
	if (!file) {
		return;
	}
	if (!contentContainerEl) {
		return;
	}
	const fileType = fileTypeMap[file.extension];
	if (fileType !== undefined) {
		// supported file format
		contentContainerEl.empty();
		renderer = await new ViewGenerator($app, contentContainerEl, file)
			.registerExtension(new ExcalidrawViewGeneratorExtension($app))
			.registerExtension(new KanbanViewGeneratorExtension($app))
			.registerExtension(new MarkdownViewGeneratorExtension())
			.registerExtension(new NonMarkdownViewGeneratorExtension())
			.load("source");
		highlightMatches(); // it should be called onMount
	}
});

onDestroy(() => {
	setTimeout(() => renderer?.unload(), 1000);
});

export async function toggleViewMode() {
	await renderer?.toggleViewMode();
}

export function focusOn(matchId: number, center?: boolean) {
	if (!matches) return;
	const match = matches[matchId];
	if (match === undefined) {
		return;
	}
	renderer?.focusOn(match, "focus-search-match", center);
}

function highlightMatches() {
	renderer?.highlightMatches(matches ?? [], "highlight-search-match");
}

// const FILE_TYPES = ['md', 'image', 'audio', 'movie', 'pdf'] as const;
// type FileType = typeof FILE_TYPES[number];
// const fileTypeMap: { [extension: string]: FileType } = {
// 	md: 'md',
// 	png: 'image',
// 	jpg: 'image',
// 	jpeg: 'image',
// 	gif: 'image',
// 	bmp: 'image',
// 	svg: 'image',
// 	mp3: 'audio',
// 	webm: 'audio',
// 	wav: 'audio',
// 	m4a: 'audio',
// 	ogg: 'audio',
// 	'3gp': 'audio',
// 	flac: 'audio',
// 	mp4: 'movie',
// 	ogv: 'movie',
// 	pdf: 'pdf',
// };
</script>

<div
	class="core-search-assistant_preview-modal_view-container"
	bind:this={contentContainerEl}
/>

<style>
	/*
		Widen the modal: Obsidian sizes it to --dialog-width (about 560px),
		which is too narrow for a note preview. The modal is the scroll
		container, so it must never scroll sideways.
	*/
	:global(.modal.core-search-assistant_preview-modal) {
		width: min(1000px, 90vw);
		max-width: 90vw;
	}

	/*
		Fit the content to the modal instead of forcing a width wider than it:
		long words wrap, media shrink, and code blocks and tables scroll on
		their own.
	*/
	.core-search-assistant_preview-modal_view-container {
		min-width: 0;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.core-search-assistant_preview-modal_view-container :global(img),
	.core-search-assistant_preview-modal_view-container :global(video) {
		max-width: 100%;
		height: auto;
	}

	.core-search-assistant_preview-modal_view-container :global(pre) {
		max-width: 100%;
		overflow-x: auto;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.markdown-rendered table) {
		display: block;
		max-width: 100%;
		overflow-x: auto;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.highlight-search-match) {
		color: var(--highlight-search-match);
		background-color: var(--highlight-search-match-bg);
	}

	.core-search-assistant_preview-modal_view-container
		:global(.focus-search-match) {
		background-color: var(--focus-search-match-bg);
	}

	/*
		reset default styles
	*/
	.core-search-assistant_preview-modal_view-container
		:global(.workspace-leaf) {
		contain: initial !important;
	}

	.core-search-assistant_preview-modal_view-container :global(.view-content) {
		overflow: unset;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.markdown-preview-view) {
		overflow: unset;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.workspace-leaf-content) {
		overflow: unset;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.workspace-leaf-resize-handle) {
		display: none;
	}
	.core-search-assistant_preview-modal_view-container :global(.view-header) {
		display: none;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.markdown-preview-view) {
		padding: 0;
	}

	.core-search-assistant_preview-modal_view-container
		:global(.markdown-source-view) {
		pointer-events: none;
	}

	/*
		render pdf correctly
	*/
	.core-search-assistant_preview-modal_view-container
		:global(.workspace-leaf-content[data-type='pdf']) {
		height: 990px;
	}

	/*
		render source view correctly
	*/
	.core-search-assistant_preview-modal_view-container
		:global(.markdown-source-view.mod-cm6 .cm-editor) {
		flex: initial; /* overwrite "flex: 1 1 0" */
		display: initial; /* overwrite "display: flex" */
	}
	.core-search-assistant_preview-modal_view-container
		:global(.markdown-source-view.mod-cm6) {
		display: initial; /* overwrite "display: flex" */
	}
	.core-search-assistant_preview-modal_view-container
		:global(.markdown-source-view.mod-cm6 .cm-scroller) {
		padding: 0;
	}
</style>
