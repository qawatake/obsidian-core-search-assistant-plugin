import CoreSearchAssistantPlugin from 'main';
import {
	App,
	Modal,
	SearchResultItem,
	WorkspaceLeaf,
	EditorRange,
	MarkdownViewModeType,
	SplitDirection,
	MarkdownView,
	Hotkey,
} from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';

type ScrollDirection = 'up' | 'down';

const SCROLL_AMOUNT = 70;

const TOGGLE_PREVIEW_COMMAND_ID = 'markdown:toggle-preview';

export class PreviewModal extends Modal {
	item: SearchResultItem;
	plugin: CoreSearchAssistantPlugin;
	leaf: WorkspaceLeaf;
	matchEls: HTMLSpanElement[];
	currentFocus: number;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		item: SearchResultItem
	) {
		super(app);
		this.plugin = plugin;
		this.item = item;
		this.leaf = new (WorkspaceLeaf as any)(app) as WorkspaceLeaf;
		this.matchEls = [];
		this.currentFocus = -1;
	}

	override async onOpen() {
		await this.createView();
		this.setViewMode('source');
		this.highlightMatches();
		this.findMatches();
		this.plugin.controller?.togglePreviewModalShown(true);

		this.scope.register(['Ctrl'], ' ', () => {
			this.shouldRestoreSelection = true;
			this.close();
		});

		this.scope.register(['Ctrl'], 'Enter', () => {
			this.openAndFocus(this.currentFocus);
			this.plugin.controller?.exit();
			this.shouldRestoreSelection = false;
			this.close();
		});

		this.scope.register(['Ctrl', 'Shift'], 'Enter', () => {
			this.openAndFocus(
				this.currentFocus,
				this.plugin.settings?.splitDirection
			);
			this.plugin.controller?.exit();
			this.shouldRestoreSelection = false;
			this.close();
		});

		this.scope.register([], ' ', () => {
			this.scroll('down');
		});
		this.scope.register(['Shift'], ' ', () => {
			this.scroll('up');
		});
		this.scope.register([], 'ArrowDown', () => {
			this.scroll('down', SCROLL_AMOUNT);
		});
		this.scope.register(['Ctrl'], 'n', () => {
			this.scroll('down', SCROLL_AMOUNT);
		});
		this.scope.register([], 'ArrowUp', () => {
			this.scroll('up', SCROLL_AMOUNT);
		});
		this.scope.register(['Ctrl'], 'p', () => {
			this.scroll('up', SCROLL_AMOUNT);
		});
		this.scope.register([], 'Tab', (evt) => {
			evt.preventDefault(); // to prevent inserting indent in editing mode in the active leaf
			this.currentFocus =
				++this.currentFocus > this.matchEls.length - 1
					? 0
					: this.currentFocus;
			this.focusOn(this.currentFocus);
		});
		this.scope.register(['Shift'], 'Tab', (evt) => {
			evt.preventDefault();
			this.currentFocus =
				--this.currentFocus < 0
					? this.matchEls.length - 1
					: this.currentFocus;
			this.focusOn(this.currentFocus);
		});

		const togglePreviewHotkeys = this.getHotkeys(TOGGLE_PREVIEW_COMMAND_ID);
		togglePreviewHotkeys.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault();
				const { leaf } = this;
				if ((leaf.view as MarkdownView).getMode() === 'preview') {
					this.setViewMode('source');
				} else {
					this.setViewMode('preview');
				}
			});
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);

		// too fast to remain search mode
		setTimeout(() => {
			this.plugin.controller?.togglePreviewModalShown(false);
		}, 100);
	}

	private detachLater(millisecond: number) {
		if (!this.leaf) {
			return;
		}
		const leafToBeDetached = this.leaf;
		setTimeout(() => {
			leafToBeDetached.detach();
		}, millisecond);
	}

	private async createView() {
		const { leaf, item, contentEl, containerEl } = this;
		contentEl.empty();
		containerEl.addClass('core-search-assistant_preview-modal-container');
		await leaf.openFile(item.file);
		contentEl.appendChild(this.leaf.containerEl);
	}

	private setViewMode(mode: MarkdownViewModeType) {
		const { leaf } = this;

		(leaf.view as MarkdownView).setMode(
			mode === 'preview'
				? (leaf.view as MarkdownView).previewMode
				: (leaf.view as MarkdownView).editMode
		);
	}

	// it should be called once because is is not idempotent
	// it can be called even when view mode = 'preview'
	private highlightMatches() {
		const { leaf, item } = this;
		const view = leaf.view as MarkdownView;
		const ranges: EditorRange[] = [];
		item.result.content?.forEach((match) => {
			const range = {
				from: view.editMode.editor.offsetToPos(match[0]),
				to: view.editMode.editor.offsetToPos(match[1]),
			};
			ranges.push(range);
		});
		((leaf.view as MarkdownView).editMode.editor as any).addHighlights(
			ranges,
			'highlight-search-match'
		);

		// this.matchesHighlighted = true;
	}

	// it should be called after highlightMatches
	// it can be called even when view mode = 'preview'
	private findMatches() {
		const { contentEl } = this;
		const matchEls: HTMLSpanElement[] = [];
		contentEl
			.querySelectorAll('span.highlight-search-match')
			.forEach((node) => {
				if (node instanceof HTMLSpanElement) {
					matchEls.push(node);
				}
			});
		this.matchEls = matchEls;
	}

	private scroll(direction: ScrollDirection, px?: number) {
		const { containerEl, contentEl } = this;
		const move =
			(px ?? containerEl.clientHeight / 2) *
			(direction === 'up' ? -1 : 1);
		contentEl.scrollBy({
			top: move,
			behavior: 'smooth',
		});
	}

	private focusOn(matchId: number) {
		[-1, 0, 1].forEach((i) => {
			const el = this.matchEls[matchId + i];
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

	async openAndFocus(matchId: number, direction?: SplitDirection) {
		const { item } = this;

		// open file
		const leaf =
			direction === undefined
				? this.app.workspace.getMostRecentLeaf()
				: this.app.workspace.splitActiveLeaf(direction);
		await leaf.openFile(item.file, {
			state: {
				mode: 'source',
			},
		});
		this.app.workspace.setActiveLeaf(leaf, true, true);

		// highlight matches
		const match = item?.result?.content?.[matchId];
		if (!match) {
			return;
		}
		const view = leaf.view as MarkdownView;
		const range = {
			from: view.editMode.editor.offsetToPos(match[0]),
			to: view.editMode.editor.offsetToPos(match[1]),
		};
		// leaf.view.modes.source.highlightSearchMatch(range.from, range.to);
		view.editMode.editor.addHighlights(
			[range],
			'obsidian-search-match-highlight'
		);

		// scroll
		view.editMode.editor.setCursor(range.from);
		view.editMode.editor.scrollIntoView(range, true);
	}

	private getHotkeys(commandId: string): Hotkey[] {
		const { hotkeyManager } = this.app;

		const customKeys = hotkeyManager.customKeys[commandId];
		if (customKeys !== undefined && customKeys.length !== 0) {
			return customKeys;
		}

		const defaultKeys = hotkeyManager.defaultKeys[commandId];
		if (defaultKeys !== undefined && defaultKeys.length !== 0) {
			return defaultKeys;
		}

		throw `getHotkey failed: command id ${commandId} is invalid`;
	}

	// private renderPreview() {
	// 	const { contentEl, containerEl } = this;
	// 	contentEl.empty();
	// 	containerEl.addClass('core-search-assistant_preview-modal-container');

	// 	this.leaf.openFile(this.item.file, { state: { mode: 'preview' } });
	// 	contentEl.appendChild(this.leaf.containerEl);
	// }

	// private async renderEdit() {
	// 	const { contentEl, containerEl, leaf, item } = this;
	// 	contentEl.empty();
	// 	containerEl.addClass('core-search-assistant_preview-modal-container');

	// 	await leaf.openFile(this.item.file, { state: { mode: 'source' } });
	// 	contentEl.appendChild(this.leaf.view.editMode.editorEl);
	// 	this.leaf.view.editMode.editorEl.addClass('markdown-editor-view');

	// 	item.result.content?.forEach((match) => {
	// 		const range = translateMatch(item.content, match);

	// 		(leaf.view.editMode.editor as any).addHighlights(
	// 			[range],
	// 			'highlight-search-match'
	// 		);
	// 	});
	// 	console.log(leaf);
	// }

	// private async renderPreviewWithHighLight() {
	// 	const { contentEl, containerEl, item } = this;
	// 	contentEl.empty();
	// 	containerEl.addClass('core-search-assistant_preview-modal-container');

	// 	const previewView = new MarkdownView(this.leaf).previewMode;
	// 	previewView.view.file = item.file; // necessary to remove error message

	// 	const content = highlightMatches(
	// 		item.content,
	// 		item.result.content ?? [],
	// 		{ cls: 'highlight-match' }
	// 	);
	// 	previewView.set(content, false); // load content

	// 	contentEl.appendChild(previewView.containerEl);
	// 	previewView.renderer.previewEl.addClass('preview-container');
	// }
}
