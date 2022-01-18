import CoreSearchAssistantPlugin from 'main';
import { App, Component, SearchResultItem, WorkspaceLeaf } from 'obsidian';
import { parseCardLayout } from 'Setting';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'WorkspacePreview';

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
			attr: { id: `core-search-assistant_card-view-cover` },
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
			cls: 'core-search-assistant_card-view-cover-content',
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
		console.log('card view loaded');

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
			this.plugin.coreSearchInterface?.open(Number.parseInt(id));
		});
	}

	override unload() {
		console.log('card view unloaded');
		this.leafs.forEach((leaf) => {
			leaf.detach();
		});
		this.leafs = [];
		this.workspaceCoverEl.empty();
		this.workspaceCoverEl.remove();
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
		this.workspaceCoverEl.addClass('core-search-assistant_hide');
		this.contentEl.empty();
		this.displayed = false;
	}

	close() {
		this.workspaceCoverEl.addClass('core-search-assistant_hide');
		this.detachLeafsLater();
		// ↓ why do not empty immediately ← to open selected item when clicked
		this.emptyLater();
		this.displayed = false;
	}

	emptyLater() {
		setTimeout(
			() => this.contentEl.empty(),
			INTERVAL_MILLISECOND_TO_BE_DETACHED
		);
	}

	renderPage(itemId: number) {
		if (!this.plugin.settings) {
			return;
		}
		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		const cardsPerPage = row * column;
		const pageId = Math.floor(itemId / cardsPerPage);

		const items = this.plugin.coreSearchInterface?.getResultItems();
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
		this.workspaceCoverEl.removeClass('core-search-assistant_hide');
		this.displayed = true;
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
