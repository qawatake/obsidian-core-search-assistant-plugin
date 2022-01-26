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

	constructor(app: App, containerEl: HTMLElement, file: TFile) {
		this.app = app;
		this.containerEl = containerEl;
		this.leaf = new (WorkspaceLeaf as any)(this.app);
		this.file = file;
		this.containerEl.appendChild(this.leaf.containerEl);
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

	toggleViewMode() {
		const view = this.leaf.view as MarkdownView;
		if (view.getMode() === 'preview') {
			this.toggleSource();
		} else {
			this.togglePreview();
		}
	}

	private async onload() {
		await this.addFile();
	}

	private onunload() {
		this.leaf.containerEl.remove();
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
	}

	scrollIntoView(match: Match, center?: boolean) {
		const view = this.leaf.view as MarkdownView;
		if (view.getMode() !== 'source') {
			return;
		}
		const editor = view.modes.source.editor;
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.scrollIntoView(range, center);
	}

	focusOn(match: Match, center?: boolean) {
		const view = this.leaf.view as MarkdownView;
		if (view.getMode() !== 'source') {
			return;
		}
		this.scrollIntoView(match, center);
		const { editor } = view.modes.source;

		editor.removeHighlights('focus-search-match');
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.addHighlights([range], 'focus-search-match');
	}
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
