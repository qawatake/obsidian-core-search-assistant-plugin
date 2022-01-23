import CoreSearchAssistantPlugin from 'main';
import {
	App,
	MarkdownView,
	Modal,
	SearchResultItem,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';
import { highlightMatches } from 'PreProcessor';

type ScrollDirection = 'up' | 'down';

const SCROLL_AMOUNT = 20;

export class PreviewModal extends Modal {
	item: SearchResultItem;
	plugin: CoreSearchAssistantPlugin;
	leaf: WorkspaceLeaf;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		item: SearchResultItem
	) {
		super(app);
		this.plugin = plugin;
		this.item = item;
		this.leaf = new (WorkspaceLeaf as any)(app) as WorkspaceLeaf;
	}

	override onOpen() {
		// this.renderPreview();
		this.renderPreviewWithHighLight();
		this.plugin.controller?.togglePreviewModalShown(true);

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
}
