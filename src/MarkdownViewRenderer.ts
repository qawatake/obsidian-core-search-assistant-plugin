import {
	App,
	EditorRange,
	MarkdownView,
	MarkdownViewModeType,
	Match,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';

export class MarkdownViewRenderer {
	app: App;
	file: TFile;
	leaf: WorkspaceLeaf;
	containerEl: HTMLElement;
	matchEls: HTMLSpanElement[];

	constructor(app: App, containerEl: HTMLElement, file: TFile) {
		this.app = app;
		this.containerEl = containerEl;
		this.leaf = new (WorkspaceLeaf as any)(this.app);
		this.file = file;
		this.containerEl.appendChild(this.leaf.containerEl);
		this.matchEls = [];
	}

	async load(): Promise<MarkdownViewRenderer> {
		await this.onload();
		return this;
	}

	async unload() {
		this.onunload();
	}

	togglePreview() {
		this.setViewMode('preview');
	}

	toggleSource() {
		this.setViewMode('source');
	}

	private async onload() {
		await this.addFile();
		this.findMatches();
	}

	private onunload() {
		this.containerEl.removeChild(this.leaf.containerEl);
		this.leaf.detach();
	}

	private async addFile() {
		const { leaf, file } = this;
		await leaf.openFile(file);
	}

	private setViewMode(mode: MarkdownViewModeType) {
		const { leaf } = this;

		(leaf.view as MarkdownView).setMode(
			mode === 'preview'
				? (leaf.view as MarkdownView).previewMode
				: (leaf.view as MarkdownView).modes.source
		);
		// leaf.view.currentMode.show();
		console.log(leaf.view.getState());
		console.log((leaf.view as MarkdownView).currentMode);
	}

	// it should be called once because is is not idempotent
	// it can be called even when view mode = 'preview'
	highlightMatches(matches: Match[]) {
		const view = this.leaf.view as MarkdownView;
		// if (view.getMode() !== 'source') {
		// 	return;
		// }
		const editor = view.modes.source.editor;
		const ranges: EditorRange[] = [];
		matches.forEach((match) => {
			const range = {
				from: editor.offsetToPos(match[0]),
				to: editor.offsetToPos(match[1]),
			};
			ranges.push(range);
		});
		editor.addHighlights(ranges, 'highlight-search-match');

		// this.matchesHighlighted = true;
	}

	// it should be called after highlightMatches
	// it can be called even when view mode = 'preview'
	private findMatches() {
		const view = this.leaf.view as MarkdownView;
		// if (view.getMode() !== 'source') {
		// 	return;
		// }
		const { contentContainerEl } = view.modes.source;
		const matchEls: HTMLSpanElement[] = [];
		contentContainerEl
			.querySelectorAll('span.highlight-search-match')
			.forEach((node) => {
				if (node instanceof HTMLSpanElement) {
					matchEls.push(node);
				}
			});
		this.matchEls = matchEls;
	}

	focusOn(matchId: number) {
		this.findMatches();
		console.log('matches', this.matchEls.length);
		[-1, 0, 1].forEach((i) => {
			const id = cyclicId(matchId + i, this.matchEls.length);
			const el = this.matchEls[id];
			if (el instanceof HTMLSpanElement) {
				if (i === 0) {
					el.addClass('focus-search-match');
					el.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});
				} else {
					el.removeClass('focus-search-match');
				}
			}
		});
	}
}

function cyclicId(id: number, total: number): number {
	return ((id % total) + total) % total;
}

// this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
// await this.leaf.openFile(item.file, { state: { mode: 'preview' } });
// this.containerEl.empty();
// this.containerEl.appendChild(this.leaf.containerEl);
// if (this.plugin.settings?.hideIframe) {
// 	this.containerEl.addClass('hide-iframe');
// }
// this.containerEl.show();
// console.log(this.leaf);
// console.log(this.leaf.getViewState());
// console.log(this.leaf.view.getState());
