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

	watchClickedCardItem() {
		const callback: EventListener = (evt: Event) => {
			if (!(evt.target instanceof HTMLElement)) {
				return;
			}
			const cardEl = this.getSelectedCardEl(evt.target);
			if (!cardEl) {
				return;
			}
			const id = cardEl.dataset['id'];
			if (id === undefined) {
				return;
			}
			this.plugin.coreSearchInterface?.open(Number.parseInt(id));
			evt.currentTarget?.removeEventListener('click', callback);
		};
		this.contentEl.addEventListener('click', callback);
	}

	// id is necessary to open the selected item when clicked
	renderItem(item: SearchResultItem, id: number) {
		const previewContainerEl = this.createPreviewContainerEl(item, id);
		const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		leaf.openFile(item.file, { state: { mode: 'preview' } });
		previewContainerEl.appendChild(leaf.containerEl);

		this.leafs.push(leaf);
	}

	renderItems(items: SearchResultItem[]) {
		if (items.length === 0) {
			return;
		}
		this.leafs = [];
		const { contentEl } = this;
		contentEl.empty();
		items.forEach((item, id) => {
			const previewContainerEl = this.createPreviewContainerEl(item, id);

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

	createPreviewContainerEl(item: SearchResultItem, id: number): HTMLElement {
		const { contentEl } = this;
		const aspectRatioEl = contentEl.createEl('div', {
			cls: 'core-search-assistant_card-view-item-container-aspect-ratio',
			attr: {
				'data-id': id,
			},
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

	focusOn(pos: number) {
		const { contentEl } = this;
		const cardEls = contentEl.childNodes;
		cardEls.forEach((el, id) => {
			if (!(el instanceof HTMLElement)) {
				return;
			}
			if (id === pos) {
				el.addClass('is-selected');
				el.scrollIntoView(
					this.plugin.settings?.keepSelectedItemsCentered
						? { block: 'center' }
						: { block: 'nearest' }
				);
			} else {
				el.removeClass('is-selected');
			}
		});
	}

	unfocus() {
		const { contentEl } = this;
		const cardEls = contentEl.childNodes;
		cardEls.forEach((el) => {
			if (!(el instanceof HTMLElement)) {
				return;
			}
			el.removeClass('is-selected');
		});
	}

	clean() {
		this.leafs.forEach((leaf) => {
			leaf.detach();
		});
		this.leafs = [];
		this.workspaceCoverEl.empty();
		this.workspaceCoverEl.remove();
	}

	hide() {
		this.detachLeafsLater();
		this.workspaceCoverEl.addClass('core-search-assistant_hide');
		this.contentEl.empty();
	}

	close() {
		this.workspaceCoverEl.addClass('core-search-assistant_hide');
		this.detachLeafsLater();
		// ↓ why do not empty immediately ← to open selected item when clicked
		this.emptyLater();
	}

	emptyLater() {
		setTimeout(
			() => this.contentEl.empty(),
			INTERVAL_MILLISECOND_TO_BE_DETACHED
		);
	}

	reveal() {
		this.workspaceCoverEl.removeClass('core-search-assistant_hide');
	}

	getSelectedCardEl(el: HTMLElement): HTMLElement | undefined {
		const parentEl = el.parentElement;
		if (el.tagName === 'DIV' && parentEl === this.contentEl) {
			return el;
		}
		if (parentEl === null) {
			return undefined;
		}
		return this.getSelectedCardEl(parentEl);
	}
}
