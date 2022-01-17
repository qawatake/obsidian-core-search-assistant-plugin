import CoreSearchAssistantPlugin from 'main';
import { App, SearchResultItem, WorkspaceLeaf } from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'WorkspacePreview';

export class CardView {
	app: App;
	plugin: CoreSearchAssistantPlugin;
	leafs: WorkspaceLeaf[];
	workspaceCoverEl: HTMLElement;
	contentEl: HTMLElement;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.leafs = [];
		this.workspaceCoverEl = createEl('div', {
			attr: { id: `core-search-assistant_card-view-cover` },
		});
		this.contentEl = this.workspaceCoverEl.createEl('div', {
			cls: 'core-search-assistant_card-view-cover-content',
		});
		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.rootSplit.containerEl.appendChild(
				this.workspaceCoverEl
			);
			this.hide();
		});
	}

	renew(items: SearchResultItem[]) {
		this.detachLeafsLater();
		this.renderFiles(items);
	}

	renderFiles(items: SearchResultItem[]) {
		if (items.length === 0) {
			return;
		}
		this.leafs = [];
		const { contentEl } = this;
		contentEl.empty();
		items.forEach((item) => {
			const previewContainerEl = this.createPreviewContainerEl(item);

			const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
			leaf.openFile(item.file, { state: { mode: 'preview' } });
			previewContainerEl.appendChild(leaf.containerEl);

			this.leafs.push(leaf);
		});
		this.reveal();
	}

	renderItem(item: SearchResultItem) {
		const previewContainerEl = this.createPreviewContainerEl(item);
		const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		leaf.openFile(item.file, { state: { mode: 'preview' } });
		previewContainerEl.appendChild(leaf.containerEl);

		this.leafs.push(leaf);
	}

	detachLeafsLater() {
		const leafsToBeDetached = this.leafs;
		this.leafs = [];
		setTimeout(() => {
			leafsToBeDetached.forEach((leaf) => {
				leaf.detach();
			});
		}, INTERVAL_MILLISECOND_TO_BE_DETACHED);
	}

	createPreviewContainerEl(item: SearchResultItem): HTMLElement {
		const { contentEl } = this;
		const aspectRatioEl = contentEl.createEl('div', {
			cls: 'core-search-assistant_card-view-item-container-aspect-ratio',
		});
		const itemContainerEl = aspectRatioEl.createEl('div', {
			cls: 'core-search-assistant_card-view-item-container',
		});
		itemContainerEl.createEl('div', {
			cls: 'core-search-assistant_card_view-item-file-name-container',
			text: item.file.name,
		});
		const previewMarginEl = itemContainerEl.createEl('div', {
			cls: 'core-search-assistant_card-view-item-preview-margin',
		});
		const previewContainerEl = previewMarginEl.createEl('div', {
			cls: 'core-search-assistant_card-view-item-preview-container',
		});
		return previewContainerEl;
	}

	hide() {
		this.detachLeafsLater();
		this.workspaceCoverEl.addClass('core-search-assistant_hide');
		this.contentEl.empty();
	}

	reveal() {
		this.workspaceCoverEl.removeClass('core-search-assistant_hide');
	}
}
