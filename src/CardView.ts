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

	renew() {
		this.detachLeafsLater();
		this.renderFiles();
	}

	renderFiles() {
		this.leafs = [];
		const { contentEl } = this;
		contentEl.empty();
		const items = this.plugin.coreSearchInterface?.getResultItems();
		if (!items) {
			return;
		}
		items.forEach((item) => {
			// const itemContainerEl = contentEl.createEl('div', {
			// 	cls: 'core-search-assistant_card-view-item-container',
			// });
			// itemContainerEl.createEl('div', {
			// 	cls: 'core-search-assistant_card_view-item-file-name-container',
			// 	text: item.file.name,
			// });
			// const previewContainerEl = itemContainerEl.createEl('div', {
			// 	cls: 'core-search-assistant_card-view-item-preview-container',
			// });
			const previewContainerEl = this.createPreviewContainerEl(item);

			const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
			leaf.openFile(item.file, { state: { mode: 'preview' } });
			previewContainerEl.appendChild(leaf.containerEl);

			this.leafs.push(leaf);
		});
		this.reveal();
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
		const itemContainerEl = contentEl.createEl('div', {
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
		// this.workspaceCoverEl.style.display = 'none';
	}

	reveal() {
		this.workspaceCoverEl.removeClass('core-search-assistant_hide');
		// this.workspaceCoverEl.style.display = 'initial';
	}
}
