import CoreSearchAssistantPlugin from 'main';
import {
	App,
	MarkdownView,
	Modal,
	SearchResultItem,
	WorkspaceLeaf,
} from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';
import { highlightMatches } from 'PreProcessor';

type ScrollDirection = 'up' | 'down';

const SCROLL_AMOUNT = 70;

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

	override onOpen() {
		// this.renderPreview();
		this.renderPreviewWithHighLight();
		this.plugin.controller?.togglePreviewModalShown(true);

		// too fast to find elements
		// it should be called after rendering
		setTimeout(() => this.findMatches(), 100);

		// to prevent the modal immediately close
		// await new Promise((resolve) => setTimeout(resolve, 1));

		this.scope.register(['Ctrl'], ' ', () => {
			this.shouldRestoreSelection = true;
			this.close();
		});

		this.scope.register(['Ctrl'], 'Enter', () => {
			this.plugin.controller?.open();
			this.plugin.controller?.exit();
			this.shouldRestoreSelection = false;
			this.close();
		});

		this.scope.register(['Ctrl', 'Shift'], 'Enter', () => {
			this.plugin.controller?.open(this.plugin.settings?.splitDirection);
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
			this.currentFocus = Math.min(
				++this.currentFocus,
				this.matchEls.length - 1
			);
			this.focusOn(this.currentFocus);
		});
		this.scope.register(['Shift'], 'Tab', (evt) => {
			evt.preventDefault();
			this.currentFocus = Math.max(--this.currentFocus, 0);
			this.focusOn(this.currentFocus);
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

	private renderPreview() {
		const { contentEl, containerEl } = this;
		contentEl.empty();
		containerEl.addClass('core-search-assistant_preview-modal-container');

		this.leaf.openFile(this.item.file, { state: { mode: 'preview' } });
		contentEl.appendChild(this.leaf.containerEl);
	}

	private async renderPreviewWithHighLight() {
		const { contentEl, containerEl, item } = this;
		contentEl.empty();
		containerEl.addClass('core-search-assistant_preview-modal-container');

		const previewView = new MarkdownView(this.leaf).previewMode;
		previewView.view.file = item.file; // necessary to remove error message

		const content = highlightMatches(
			item.content,
			item.result.content ?? [],
			{ cls: 'highlight-match' }
		);
		previewView.set(content, false); // load content

		contentEl.appendChild(previewView.containerEl);
		previewView.renderer.previewEl.addClass('preview-container');
	}

	private findMatches() {
		const { contentEl } = this;
		const matches = contentEl.querySelectorAll('span.highlight-match');
		matches.forEach((node) => {
			if (node instanceof HTMLSpanElement) {
				this.matchEls.push(node);
			}
		});
	}

	private focusOn(matchId: number) {
		[-1, 0, 1].forEach((i) => {
			const el = this.matchEls[matchId + i];
			if (el instanceof HTMLSpanElement) {
				if (i === 0) {
					el.addClass('focus-match');
					el.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});
				} else {
					el.removeClass('focus-match');
				}
			}
		});
	}
}
