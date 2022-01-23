import CoreSearchAssistantPlugin from 'main';
import {
	App,
	Component,
	MarkdownView,
	SearchResultItem,
	WorkspaceLeaf,
} from 'obsidian';
import { parseCardLayout } from 'Setting';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';

export class CardView extends Component {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private leafs: WorkspaceLeaf[];
	private workspaceCoverEl: HTMLElement;
	private contentEl: HTMLElement;
	private displayed: boolean;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.leafs = [];
		this.workspaceCoverEl = createEl('div', {
			attr: { id: `core-search-assistant_card-view` },
		});
		this.displayed = false;

		let row = 0;
		let column = 0;
		if (this.plugin.settings) {
			[row, column] = parseCardLayout(
				this.plugin.settings.cardViewLayout
			);
		}
		this.contentEl = this.workspaceCoverEl.createEl('div', {
			cls: 'content',
		});
		this.contentEl.style.gridTemplateColumns = `repeat(${column}, minmax(0, 1fr))`;
		this.contentEl.style.gridTemplateRows = `repeat(${row}, 1fr)`;

		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.rootSplit.containerEl.appendChild(
				this.workspaceCoverEl
			);
			this.hide();
		});
	}

	override onload() {
		this.registerDomEvent(this.contentEl, 'click', (evt: MouseEvent) => {
			if (!this.displayed) {
				return;
			}
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
			this.plugin.SearchComponentInterface?.open(Number.parseInt(id));
		});
	}

	override unload() {
		this.leafs.forEach((leaf) => {
			leaf.detach();
		});
		this.leafs = [];
		this.workspaceCoverEl.empty();
		this.workspaceCoverEl.remove();
	}

	// id is necessary to open the selected item when clicked
	renderItem(item: SearchResultItem, id: number) {
		this.renderItemByPreviewView(item, id);
		// const previewContainerEl = this.createPreviewContainerEl(item, id);
		// const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		// leaf.openFile(item.file, { state: { mode: 'preview' } });
		// previewContainerEl.appendChild(leaf.containerEl);

		// this.leafs.push(leaf);
	}

	// id is necessary to open the selected item when clicked
	private async renderItemByPreviewView(item: SearchResultItem, id: number) {
		const previewContainerEl = this.createPreviewContainerEl(item, id);
		const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		const previewView = new MarkdownView(leaf).previewMode;
		previewView.view.file = item.file; // necessary to remove error message
		previewView.set(await this.app.vault.read(item.file), false); // load content
		previewContainerEl.appendChild(previewView.containerEl);
		previewView.renderer.previewEl.addClass('preview-container');
		this.leafs.push(leaf);
	}

	focusOn(pos: number) {
		const { contentEl } = this;
		const cardEls = contentEl.childNodes;
		[-1, 0, 1].forEach((i) => {
			const el = cardEls.item(pos + i);
			if (!(el instanceof HTMLElement)) {
				return;
			}
			if (i === 0) {
				el.addClass('is-selected');
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

	hide() {
		this.detachLeafsLater();
		this.workspaceCoverEl.toggleVisibility(false);
		this.contentEl.empty();
		this.displayed = false;
	}

	renderPage(itemId: number) {
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) {
			return;
		}
		const pageId = Math.floor(itemId / cardsPerPage);

		const items = this.plugin.SearchComponentInterface?.getResultItems();
		if (!items) {
			return;
		}
		for (
			let i = pageId * cardsPerPage;
			i < (pageId + 1) * cardsPerPage;
			i++
		) {
			const item = items[i];
			if (!item) {
				continue;
			}
			this.renderItem(item, i);
		}

		this.setLayout();
	}

	reveal() {
		this.workspaceCoverEl.toggleVisibility(true);
		this.displayed = true;
	}

	// set grid layout
	setLayout() {
		if (!this.plugin.settings) {
			return;
		}
		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		this.contentEl.style.gridTemplateColumns = `repeat(${column}, minmax(0, 1fr))`;
		this.contentEl.style.gridTemplateRows = `repeat(${row}, 1fr)`;
	}

	// delay detachment because otherwise ↓ occur
	// "Uncaught TypeError: Cannot read property 'onResize' of null"
	private detachLeafsLater() {
		const leafsToBeDetached = this.leafs;
		this.leafs = [];
		setTimeout(() => {
			leafsToBeDetached.forEach((leaf) => {
				leaf.detach();
			});
		}, INTERVAL_MILLISECOND_TO_BE_DETACHED);
	}

	private createPreviewContainerEl(
		item: SearchResultItem,
		id: number
	): HTMLElement {
		const { contentEl } = this;
		const itemContainerEl = contentEl.createEl('div', {
			cls: 'item-container',
			attr: {
				'data-id': id,
				'data-path': item.file.path,
			},
		});
		itemContainerEl.createEl('div', {
			cls: 'file-name-container',
			text: item.file.basename, // extension is unnecessary because built-in search does not catch other formats
		});
		const previewMarginEl = itemContainerEl.createEl('div', {
			cls: 'preview-container-wrapper',
		});
		const previewContainerEl = previewMarginEl.createEl('div', {
			cls: 'preview-container',
		});
		if (this.plugin.settings?.hideIframe) {
			previewContainerEl.addClass('hide-iframe');
		}
		return previewContainerEl;
	}

	private getSelectedCardEl(el: HTMLElement): HTMLElement | undefined {
		const parentEl = el.parentElement;
		if (el.tagName === 'DIV' && parentEl === this.contentEl) {
			return el;
		}
		if (parentEl === null) {
			return undefined;
		}
		return this.getSelectedCardEl(parentEl);
	}

	itemsRenderedCorrectly(): boolean {
		const wantedItems =
			this.plugin.SearchComponentInterface?.getResultItems();
		if (wantedItems === undefined) {
			return false;
		}
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) {
			return false;
		}
		const length = Math.min(wantedItems.length, cardsPerPage);

		const gotItemEls = this.contentEl.children;
		for (let i = 0; i < length; i++) {
			const want = wantedItems[i];
			const got = gotItemEls.item(i);
			if (want === undefined) {
				if (got === null) {
					continue;
				} else {
					return false;
				}
			}

			if (!(got instanceof HTMLElement)) {
				return false;
			}
			if (got.dataset['path'] !== want.file.path) {
				return false;
			}
		}

		return true;
	}

	private cardsPerPage(): number | undefined {
		if (!this.plugin.settings) {
			return undefined;
		}

		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		return row * column;
	}

	// private renderItems(items: SearchResultItem[]) {
	// 	if (items.length === 0) {
	// 		return;
	// 	}
	// 	this.leafs = [];
	// 	const { contentEl } = this;
	// 	contentEl.empty();
	// 	items.forEach((item, id) => {
	// 		const previewContainerEl = this.createPreviewContainerEl(item, id);

	// 		const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
	// 		leaf.openFile(item.file, { state: { mode: 'preview' } });
	// 		previewContainerEl.appendChild(leaf.containerEl);

	// 		this.leafs.push(leaf);
	// 	});
	// 	this.reveal();
	// }
}
