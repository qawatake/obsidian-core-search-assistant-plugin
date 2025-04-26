import {
	App,
	type EditorRange,
	MarkdownView,
	type MarkdownViewModeType,
	TFile,
	WorkspaceLeaf,
	type SearchMatches,
	type SearchMatchPart,
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
	}

	async load(mode?: MarkdownViewModeType): Promise<ViewGenerator> {
		await this.onload(mode);
		return this;
	}

	async unload() {
		this.onunload();
	}

	async toggleViewMode() {
		for (const ext of this.extensions) {
			if (!(await ext.isMine(this.leaf))) continue;
			await ext.toggleViewMode(this.leaf);
			return;
		}
	}

	private async onload(mode?: MarkdownViewModeType) {
		const fileType = fileTypeMap[this.file.extension];
		if (!fileType) return;

		this.containerEl.appendChild(this.leaf.containerEl);
		await this.openFile();
		for (const ext of this.extensions) {
			if (!(await ext.isMine(this.leaf))) continue;
			await ext.setViewMode(this.leaf, mode ?? 'preview');
			return;
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
	highlightMatches(matches: SearchMatches, cls: string) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			return;
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
		editor.addHighlights(ranges, cls);
	}

	async scrollIntoView(match: SearchMatchPart, center?: boolean) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			return;
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

	async focusOn(match: SearchMatchPart, cls: string, center?: boolean) {
		const view = this.leaf.view;
		if (!(view instanceof MarkdownView)) {
			return;
		}
		if (view.getMode() !== 'source') {
			return;
		}

		await this.scrollIntoView(match, center);

		const { editor } = view;

		editor.removeHighlights(cls);
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.addHighlights([range], cls);
	}

	registerExtension(ext: ViewGeneratorExtension): ViewGenerator {
		this.extensions.push(ext);
		return this;
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

const FILE_TYPES = ['md', 'image', 'audio', 'movie', 'pdf'] as const;
type FileType = (typeof FILE_TYPES)[number];
export const fileTypeMap: { [extension: string]: FileType } = {
	md: 'md',
	png: 'image',
	jpg: 'image',
	jpeg: 'image',
	gif: 'image',
	bmp: 'image',
	svg: 'image',
	webp: 'image',
	mp3: 'audio',
	webm: 'audio',
	wav: 'audio',
	m4a: 'audio',
	ogg: 'audio',
	'3gp': 'audio',
	flac: 'audio',
	mp4: 'movie',
	ogv: 'movie',
	pdf: 'pdf',
};
