import type CoreSearchAssistantPlugin from 'main';
import {
	App,
	Modal,
	type SearchResultItem,
	type SplitDirection,
	MarkdownView,
	type Hotkey,
} from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';
import { ViewGenerator } from 'interfaces/ViewGenerator';
import { scrollIteration } from 'utils/Util';
import type { ModeScope } from 'ModeScope';

type ScrollDirection = 'up' | 'down';

const SCROLL_AMOUNT = 70;

const TOGGLE_PREVIEW_COMMAND_ID = 'markdown:toggle-preview';

export class PreviewModal extends Modal {
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly modeScope: ModeScope;
	private readonly item: SearchResultItem;

	currentFocus: number;
	renderer: ViewGenerator | undefined;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		modeScope: ModeScope,
		item: SearchResultItem
	) {
		super(app);
		this.plugin = plugin;
		this.modeScope = modeScope;
		this.item = item;
		this.currentFocus = -1;
	}

	override async onOpen() {
		await this.renderView();
		this.renderer?.highlightMatches(this.item.result.content ?? []);

		this.modeScope.push();
		const hotkeyMap = this.plugin.settings?.previewModalHotkeys;
		if (!hotkeyMap) return;

		hotkeyMap.closeModal.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.shouldRestoreSelection = true;
				this.close();
			});
		});

		hotkeyMap.open.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.openAndFocus(this.currentFocus);
				this.plugin.controller?.exit();
				this.shouldRestoreSelection = false;
				this.close();
			});
		});

		hotkeyMap.openInNewPage.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.openAndFocus(
					this.currentFocus,
					this.plugin.settings?.splitDirection
				);
				this.plugin.controller?.exit();
				this.shouldRestoreSelection = false;
				this.close();
			});
		});

		hotkeyMap.bigScrollDown.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll('down');
			});
		});

		hotkeyMap.bigScrollUp.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll('up');
			});
		});

		hotkeyMap.scrollDown.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll('down', SCROLL_AMOUNT);
			});
		});

		hotkeyMap.scrollUp.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll('up', SCROLL_AMOUNT);
			});
		});

		hotkeyMap.focusNext.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault(); // to prevent inserting indent in editing mode in the active leaf
				const numMatches = this.countMatches();
				if (numMatches === undefined || numMatches === 0) {
					return;
				}
				this.currentFocus = cyclicId(++this.currentFocus, numMatches);
				this.focusOn(this.currentFocus, true);
			});
		});

		hotkeyMap.focusPrevious.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault();
				const numMatches = this.countMatches();
				if (numMatches === undefined || numMatches === 0) {
					return;
				}
				this.currentFocus = cyclicId(--this.currentFocus, numMatches);
				this.focusOn(this.currentFocus, true);
			});
		});

		const togglePreviewHotkeys = this.getHotkeys(TOGGLE_PREVIEW_COMMAND_ID);
		togglePreviewHotkeys.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault();
				this.toggleViewMode();
			});
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.requestUnloadRenderer(INTERVAL_MILLISECOND_TO_BE_DETACHED);

		// too fast to remain search mode
		setTimeout(() => {
			if (this.modeScope.depth > 1) {
				this.modeScope.pop();
			}
		}, 100);
	}

	private requestUnloadRenderer(millisecond: number) {
		const renderer = this.renderer;
		this.renderer = undefined;
		setTimeout(() => {
			renderer?.unload();
		}, millisecond);
	}

	private async renderView() {
		const { contentEl, containerEl, item } = this;
		contentEl.empty();
		contentEl.hide();
		if (this.app.vault.config.legacyEditor) {
			containerEl.addClass(
				'core-search-assistant_preview-modal-container_legacy'
			);
		} else {
			containerEl.addClass(
				'core-search-assistant_preview-modal-container'
			);
		}
		this.renderer = await new ViewGenerator(
			this.app,
			contentEl,
			item.file
		).load('source');
		contentEl.show();
	}

	private countMatches(): number | undefined {
		return this.item.result.content?.length;
	}

	private toggleViewMode() {
		this.renderer?.toggleViewMode();
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

	private focusOn(matchId: number, center?: boolean) {
		const { renderer, item } = this;
		const match = item.result.content?.[matchId];
		if (match === undefined) {
			return;
		}
		renderer?.focusOn(match, center);
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
		const { view } = leaf;
		if (!(view instanceof MarkdownView)) {
			throw '[ERROR in Core Search Assistant] failed to openAndFocus: view is not an instance of MarkdownView';
		}
		const editor = view.editor;
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.addHighlights([range], 'obsidian-search-match-highlight');

		// scroll
		// if content of a file is too large, we need to call scrollIntoView many times
		const iter = scrollIteration(editor);
		if (iter === undefined) {
			return;
		}
		for (let i = 0; i < iter; i++) {
			editor.scrollIntoView(range, true);
		}
		editor.setCursor(range.from);
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

	// [-1, 0, 1].forEach((i) => {
	// 	const id = cyclicId(matchId + i, this.matchEls.length);
	// 	const el = this.matchEls[id];
	// 	if (el instanceof HTMLSpanElement) {
	// 		if (i === 0) {
	// 			el.addClass('focus-search-match');
	// 			el.scrollIntoView({
	// 				behavior: 'smooth',
	// 				block: 'center',
	// 			});
	// 		} else {
	// 			el.removeClass('focus-search-match');
	// 		}
	// 	}
	// });

	// it should be called once because is is not idempotent
	// it can be called even when view mode = 'preview'
	// private highlightMatches() {
	// 	const { leaf, item } = this;
	// 	const view = leaf.view as MarkdownView;
	// 	const ranges: EditorRange[] = [];
	// 	item.result.content?.forEach((match) => {
	// 		const range = {
	// 			from: view.editMode.editor.offsetToPos(match[0]),
	// 			to: view.editMode.editor.offsetToPos(match[1]),
	// 		};
	// 		ranges.push(range);
	// 	});
	// 	((leaf.view as MarkdownView).editMode.editor as any).addHighlights(
	// 		ranges,
	// 		'highlight-search-match'
	// 	);

	// 	// this.matchesHighlighted = true;
	// }

	// it should be called once because is is not idempotent
	// it can be called even when view mode = 'preview'
	// private highlightMatches() {
	// 	const { markdownView, item } = this;
	// 	const editor = markdownView.modes.source.editor;
	// 	const ranges: EditorRange[] = [];
	// 	item.result.content?.forEach((match) => {
	// 		const range = {
	// 			from: editor.offsetToPos(match[0]),
	// 			to: editor.offsetToPos(match[1]),
	// 		};
	// 		ranges.push(range);
	// 	});
	// 	editor.addHighlights(ranges, 'highlight-search-match');
	// }

	// it should be called after highlightMatches
	// it can be called even when view mode = 'preview'
	// private findMatches() {
	// 	const { contentEl } = this;
	// 	const matchEls: HTMLSpanElement[] = [];
	// 	contentEl
	// 		.querySelectorAll('span.highlight-search-match')
	// 		.forEach((node) => {
	// 			if (node instanceof HTMLSpanElement) {
	// 				matchEls.push(node);
	// 			}
	// 		});
	// 	this.matchEls = matchEls;
	// }

	// private async createView() {
	// 	const { markdownView, contentEl, containerEl, item } = this;
	// 	contentEl.empty();
	// 	if (this.app.vault.config.legacyEditor) {
	// 		containerEl.addClass(
	// 			'core-search-assistant_preview-modal-container_legacy'
	// 		);
	// 	} else {
	// 		containerEl.addClass(
	// 			'core-search-assistant_preview-modal-container'
	// 		);
	// 	}
	// 	markdownView.file = item.file;
	// 	markdownView.setViewData(item.content, true);
	// 	contentEl.appendChild(markdownView.containerEl);
	// }

	// private setViewMode(mode: MarkdownViewModeType) {
	// 	const { leaf } = this;

	// 	(leaf.view as MarkdownView).setMode(
	// 		mode === 'preview'
	// 			? (leaf.view as MarkdownView).previewMode
	// 			: (leaf.view as MarkdownView).editMode
	// 	);
	// }

	// private setViewMode(mode: MarkdownViewModeType) {
	// 	const { markdownView } = this;
	// 	markdownView.setMode(
	// 		mode === 'preview'
	// 			? markdownView.previewMode
	// 			: markdownView.modes.source
	// 	);

	// 	if (mode === 'source') {
	// 		this.findMatches();
	// 	}
	// }

	// private async createView() {
	// 	const { leaf, item, contentEl, containerEl } = this;
	// 	contentEl.empty();
	// 	containerEl.addClass('core-search-assistant_preview-modal-container');
	// 	await leaf.openFile(item.file);
	// 	contentEl.appendChild(this.leaf.containerEl);
	// }

	// private detachLater(millisecond: number) {
	// 	if (!this.leaf) {
	// 		return;
	// 	}
	// 	const leafToBeDetached = this.leaf;
	// 	setTimeout(() => {
	// 		leafToBeDetached.detach();
	// 	}, millisecond);
	// }

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

function cyclicId(id: number, total: number): number {
	return ((id % total) + total) % total;
}
