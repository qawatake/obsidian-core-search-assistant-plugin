import {
	App,
	type EditorRange,
	MarkdownView,
	type MarkdownViewModeType,
	type Match,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';
import { delay, scrollIteration } from 'utils/Util';

export class ViewGenerator {
	private readonly app: App;
	private readonly file: TFile;
	private readonly leaf: WorkspaceLeaf;
	private readonly containerEl: HTMLElement;
	private readonly extensions: ViewGeneratorExtension[] = [];

	constructor(app: App, containerEl: HTMLElement, file: TFile) {
		this.app = app;
		this.containerEl = containerEl;
		this.leaf = new (WorkspaceLeaf as any)(this.app);
		this.file = file;
		this.containerEl.appendChild(this.leaf.containerEl);
	}

	async load(mode?: MarkdownViewModeType): Promise<ViewGenerator> {
		await this.onload(mode);
		return this;
	}

	async unload() {
		this.onunload();
	}

	// async togglePreview() {
	// 	await this.setViewMode('preview');
	// }

	// async toggleSource() {
	// 	await this.setViewMode('source');
	// }
	async setViewMode(mode: MarkdownViewModeType) {
		await this.leaf.view.setState(
			{
				...this.leaf.view.getState(),
				mode: mode,
			},
			{}
		);
	}

	async toggleViewMode() {
		for (const ext of this.extensions) {
			if (!(await ext.isMine(this.leaf))) continue;
			await ext.toggleViewMode(this.leaf);
			return;
		}

		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			throw '[ERROR in Core Search Assistant] failed to toggle view mode: view is not an instance of MarkdownView';
		}
		await this.setViewMode(
			view.getMode() === 'preview' ? 'source' : 'source'
		);
	}

	private async onload(mode?: MarkdownViewModeType) {
		await this.openFile();
		for (const ext of this.extensions) {
			if (!(await ext.isMine(this.leaf))) continue;
			await ext.setViewMode(this.leaf, mode ?? 'preview');
			return;
		}
		if (this.leaf.view instanceof MarkdownView) {
			this.setViewMode(mode ?? 'preview');
		}
	}

	private onunload() {
		this.leaf.detach();
	}

	private async openFile() {
		const { leaf, file } = this;
		await leaf.openFile(file);
	}

	// it should be called once because is is not idempotent
	// it can be called even when view mode = 'preview'
	highlightMatches(matches: Match[]) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			throw '[ERROR in Core Search Assistant] failed to highlight matches: view is not an instance of MarkdownView';
		}
		const editor = view.editor;
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

	async scrollIntoView(match: Match, center?: boolean) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			throw '[ERROR in Core Search Assistant] failed to scroll into view: view is not an instance of MarkdownView';
		}
		if (view.getMode() !== 'source') {
			return;
		}
		const editor = view.editor;
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};

		// if content of a file is too large, we need to call scrollIntoView many times
		const iter = scrollIteration(editor);
		if (iter === undefined) {
			return;
		}
		for (let i = 0; i < iter; i++) {
			editor.scrollIntoView(range, center);
			await delay(1);
		}
	}

	async focusOn(match: Match, center?: boolean) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			throw '[ERROR in Core Search Assistant] failed to focusOn: view is not an instance of MarkdownView';
		}
		if (view.getMode() !== 'source') {
			return;
		}

		await this.scrollIntoView(match, center);

		const { editor } = view;

		editor.removeHighlights('focus-search-match');
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.addHighlights([range], 'focus-search-match');
	}

	registerExtension(ext: ViewGeneratorExtension): ViewGenerator {
		this.extensions.push(ext);
		return this;
	}

	private oppositeMode(mode: MarkdownViewModeType): MarkdownViewModeType {
		return mode === 'preview' ? 'source' : 'preview';
	}
}

export interface ViewGeneratorExtension {
	isMine(leaf: WorkspaceLeaf): boolean | Promise<boolean>;

	setViewMode(
		leaf: WorkspaceLeaf,
		mode: MarkdownViewModeType
	): void | Promise<void>;
	toggleViewMode(leaf: WorkspaceLeaf): void | Promise<void>;
}
