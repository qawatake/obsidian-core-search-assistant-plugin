<script lang="ts">
import { ViewGenerator, fileTypeMap } from "interfaces/ViewGenerator";
import { ExcalidrawViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Excalidraw";
import { KanbanViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Kanban";
import { MarkdownViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/Markdown";
import { NonMarkdownViewGeneratorExtension } from "interfaces/viewGeneratorExtensions/NonMarkdown";
import type { TFile } from "obsidian";
import { createEventDispatcher, onDestroy, onMount } from "svelte";
import { app } from "ui/store";

// consts
// extension: file type
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
// // FileType: icon
// const fileIconMap = new Map<FileType | undefined, string>([
// 	['md', 'document'],
// 	['image', 'image-file'],
// 	['audio', 'audio-file'],
// 	['movie', 'play-audio-glyph'],
// 	['pdf', 'pdf-file'],
// 	[undefined, 'question-mark-glyph'],
// ]);

// props
export let id: number;
export let file: TFile;
// export let matches: SearchMatches;
export let selected: boolean;
export let focusEl: HTMLElement | undefined | null; // refocus this element when blur by something like Excalidraw or iframes

// bind
let contentContainerEl: HTMLElement | undefined | null;
let fileNameContainerEl: HTMLElement | undefined | null;
// let iconContainerEl: HTMLElement | undefined | null;

// internal variables
let renderer: ViewGenerator | undefined;
const dispatch = createEventDispatcher();

export function path(): string {
	return file.path;
}

onMount(async () => {
	// path
	if (!fileNameContainerEl) {
		return;
	}
	renderFileName(file.name, fileNameContainerEl);

	// render file content
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
			.load("preview");
	}

	focusEl?.focus();
	// setFileIcon(file);
});

onDestroy(() => {
	setTimeout(() => renderer?.unload(), 1000);
});

async function onClicked() {
	await openFile();
	dispatch("click");
}

async function openFile() {
	const leaf = $app.workspace.getMostRecentLeaf();
	await leaf.openFile(file);
	$app.workspace.setActiveLeaf(leaf, true, true);
}

// function setFileIcon(file: TFile) {
// 	if (!iconContainerEl) {
// 		return;
// 	}
// 	iconContainerEl.empty();

// 	const iconId = fileIconMap.get(fileTypeMap[file.extension]);
// 	if (iconId === undefined) {
// 		return;
// 	}
// 	setIcon(iconContainerEl, iconId);
// }

function renderFileName(fileName: string, containerEl: HTMLElement) {
	// let cur = 0;
	// // matches.forEach((match) => {
	// // 	containerEl.appendText(filePath.slice(cur, match[0]));
	// // 	containerEl.createSpan({
	// // 		text: filePath.slice(match[0], match[1]),
	// // 		cls: 'matched-in-path',
	// // 	});
	// // 	cur = match[1];
	// // });
	// containerEl.appendText(filePath.slice(cur));
	containerEl.appendText(fileName);
}
</script>

<div
	class="core-search-assistant_card-container"
	class:is-selected={selected}
	data-id={id}
	data-path={file.path}
	role="button"
	on:click={onClicked}
>
	<div class="card-container-header">
		<!-- <div class="file-icon-container" bind:this={iconContainerEl} /> -->
		<div class="file-name-container" bind:this={fileNameContainerEl} />
		<!-- <div class="file-name-container">{file.basename}</div> -->
	</div>

	<div class="content-container-wrapper">
		<div class="content-container" bind:this={contentContainerEl}>
			<div class="content-not-supported-file-format">
				{`${file.extension.toUpperCase()} file`}
			</div>
		</div>
	</div>
</div>

<style>
	.core-search-assistant_card-container {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		height: 100%;
		position: relative;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
		border-radius: 10px;
		cursor: pointer;
		background-color: var(--background-primary);
		box-sizing: content-box;
	}

	.core-search-assistant_card-container:hover {
		/* top: -2px;
		box-shadow: 0 4px 5px var(--interactive-accent); */
		border: 5px solid var(--interactive-accent);
		margin: -5px;
	}

	.core-search-assistant_card-container.is-selected {
		/* top: -2px;
		box-shadow: 0 4px 5px var(--interactive-accent); */
		border: 5px solid var(--interactive-accent);
		margin: -5px;
	}

	.card-container-header {
		padding: 5px 10px;
		background-color: var(--background-secondary);
		display: flex;
		color: var(--text-muted);
	}

	/* .file-icon-container {
		padding-right: 7px;
	} */

	.file-name-container {
		font-size: 1rem;
		line-height: 1.2rem;
		overflow-wrap: break-word;
		min-width: 0;
		flex: 1;
	}

	.file-name-container :global(span.matched-in-path) {
		color: var(--text-normal);
		font-weight: bold;
	}

	.content-container-wrapper {
		padding: 5px;
		flex: 1;
		height: 100%;
		min-height: 0;
	}

	.content-container {
		overflow: hidden;
		height: 100%;

		font-size: 0.8rem;
		line-height: 1.2;
	}

	.content-container div.content-not-supported-file-format {
		font-size: 1rem;
		color: var(--text-muted);
	}

	.content-container :global(p) {
		font-size: 0.8rem;
		line-height: 1.2;
	}

	.content-container :global(code) {
		font-size: 0.8rem;
		line-height: 1.2;
	}

	.content-container :global(div) {
		font-size: 0.8rem;
	}

	.content-container :global(li) {
		font-size: 0.8rem;
		line-height: 1.2;
	}

	.content-container :global(h1) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}
	.content-container :global(h2) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}
	.content-container :global(h3) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}
	.content-container :global(h4) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}
	.content-container :global(h5) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}
	.content-container :global(h6) {
		font-size: 1rem;
		line-height: 1.2;
		margin: 5px;
	}

	.content-container :global(a) {
		pointer-events: none;
	}

	/* modify preview */
	.content-container :global(.workspace-leaf) {
		contain: initial !important;
		height: 100%;
	}
	.content-container :global(.workspace-leaf-resize-handle) {
		display: none;
	}
	.content-container :global(.view-header) {
		display: none;
	}
	.content-container :global(.view-content) {
		flex: 1;
		overflow: hidden;
	}
	.content-container :global(.markdown-preview-view) {
		padding: 0;
		overflow: hidden;
	}
	.content-container :global(.modal-content) {
		margin: 0;
	}
</style>
