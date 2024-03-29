export {};
// import type CoreSearchAssistantPlugin from 'main';
// import { App, Component, type SearchResultItem } from 'obsidian';
// import { parseCardLayout } from 'Setting';
// import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';
// import { ViewGenerator } from 'interfaces/ViewGenerator';
// import { KanbanViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Kanban';
// import { MarkdownViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Markdown';
// import { NonMarkdownViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/NonMarkdown';
// import { ExcalidrawViewGeneratorExtension } from 'interfaces/viewGeneratorExtensions/Excalidraw';

// export class CardView extends Component {
// 	private readonly app: App;
// 	private readonly plugin: CoreSearchAssistantPlugin;
// 	private readonly containerEl: HTMLElement;
// 	private readonly contentEl: HTMLElement;
// 	private renderers: ViewGenerator[];

// 	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
// 		super();
// 		this.app = app;
// 		this.plugin = plugin;
// 		this.containerEl = this.createContainerEl();
// 		this.contentEl = this.createContentEl();
// 		this.renderers = [];
// 	}

// 	override onload() {
// 		this.registerDomEvent(this.contentEl, 'click', this.onCardItemClicked);

// 		this.attachContainerEl();
// 	}

// 	override onunload(): void {
// 		this.requestUnloadRenderers();
// 		this.containerEl.empty();
// 		this.containerEl.remove();
// 	}

// 	// id is necessary to open the selected item when clicked
// 	renderItem(item: SearchResultItem, id: number) {
// 		this.renderItemByViewGenerator(item, id);
// 	}

// 	focusOn(pos: number) {
// 		const { contentEl } = this;
// 		const cardEls = contentEl.childNodes;
// 		[-1, 0, 1].forEach((i) => {
// 			const el = cardEls.item(pos + i);
// 			if (!(el instanceof HTMLElement)) {
// 				return;
// 			}
// 			if (i === 0) {
// 				el.addClass('is-selected');
// 			} else {
// 				el.removeClass('is-selected');
// 			}
// 		});
// 	}

// 	unfocus() {
// 		const { contentEl } = this;
// 		const cardEls = contentEl.childNodes;
// 		cardEls.forEach((el) => {
// 			if (!(el instanceof HTMLElement)) {
// 				return;
// 			}
// 			el.removeClass('is-selected');
// 		});
// 	}

// 	clear() {
// 		this.requestUnloadRenderers();
// 		this.containerEl.hide();
// 		this.contentEl.empty();
// 	}

// 	renderPage(itemId: number) {
// 		const cardsPerPage = this.cardsPerPage();
// 		if (cardsPerPage === undefined) {
// 			return;
// 		}
// 		const pageId = Math.floor(itemId / cardsPerPage);

// 		const items = this.plugin.searchInterface?.resultItems;
// 		if (!items) {
// 			return;
// 		}
// 		for (
// 			let i = pageId * cardsPerPage;
// 			i < (pageId + 1) * cardsPerPage;
// 			i++
// 		) {
// 			const item = items[i];
// 			if (!item) {
// 				continue;
// 			}
// 			this.renderItem(item, i);
// 		}

// 		this.setLayout();
// 	}

// 	reveal() {
// 		this.containerEl.show();
// 	}

// 	// set grid layout
// 	setLayout() {
// 		if (!this.plugin.settings) {
// 			return;
// 		}
// 		const [row, column] = parseCardLayout(
// 			this.plugin.settings.cardViewLayout
// 		);
// 		this.contentEl.style.gridTemplateColumns = `repeat(${column}, minmax(0, 1fr))`;
// 		this.contentEl.style.gridTemplateRows = `repeat(${row}, 1fr)`;
// 	}

// 	get itemsRenderedCorrectly(): boolean {
// 		const wantedItems = this.plugin.searchInterface?.resultItems;
// 		if (wantedItems === undefined) {
// 			return false;
// 		}
// 		const cardsPerPage = this.cardsPerPage();
// 		if (cardsPerPage === undefined) {
// 			return false;
// 		}
// 		const length = Math.min(wantedItems.length, cardsPerPage);

// 		const gotItemEls = this.contentEl.children;
// 		for (let i = 0; i < length; i++) {
// 			const want = wantedItems[i];
// 			const got = gotItemEls.item(i);
// 			if (want === undefined) {
// 				if (got === null) {
// 					continue;
// 				} else {
// 					return false;
// 				}
// 			}

// 			if (!(got instanceof HTMLElement)) {
// 				return false;
// 			}
// 			if (got.dataset['path'] !== want.file.path) {
// 				return false;
// 			}
// 		}

// 		return true;
// 	}

// 	private createContainerEl(): HTMLElement {
// 		const containerEl = createEl('div', {
// 			attr: { id: `core-search-assistant_card-view` },
// 		});
// 		return containerEl;
// 	}

// 	private attachContainerEl() {
// 		// rootSplit will be undefined when Obsidian reloaded because dom elements are not fully rendered.
// 		this.app.workspace.onLayoutReady(() => {
// 			this.app.workspace.rootSplit.containerEl.appendChild(
// 				this.containerEl
// 			);
// 			this.containerEl.hide();
// 		});
// 	}

// 	private createContentEl(): HTMLElement {
// 		let row = 0;
// 		let column = 0;
// 		if (this.plugin.settings) {
// 			[row, column] = parseCardLayout(
// 				this.plugin.settings.cardViewLayout
// 			);
// 		}
// 		const contentEl = this.containerEl.createEl('div', {
// 			cls: 'content',
// 		});
// 		contentEl.style.gridTemplateColumns = `repeat(${column}, minmax(0, 1fr))`;
// 		contentEl.style.gridTemplateRows = `repeat(${row}, 1fr)`;
// 		return contentEl;
// 	}

// 	private async renderItemByViewGenerator(
// 		item: SearchResultItem,
// 		id: number
// 	) {
// 		const previewContainerEl = this.createPreviewContainerEl(item, id);
// 		previewContainerEl.empty();
// 		if (supportedFileTypes.includes(item.file.extension)) {
// 			const renderer = await new ViewGenerator(
// 				this.app,
// 				previewContainerEl,
// 				item.file
// 			)
// 				.registerExtension(new KanbanViewGeneratorExtension(this.app))
// 				.registerExtension(
// 					new ExcalidrawViewGeneratorExtension(this.app)
// 				)
// 				.registerExtension(new MarkdownViewGeneratorExtension())
// 				.registerExtension(new NonMarkdownViewGeneratorExtension())
// 				.load('preview');
// 			this.renderers.push(renderer);
// 		} else {
// 			previewContainerEl.createDiv({
// 				text: `${item.file.extension} file`,
// 				cls: 'unsupported-file-content',
// 			});
// 		}
// 	}

// 	private requestUnloadRenderers() {
// 		const renderersToUnload = this.renderers;
// 		this.renderers = [];
// 		setTimeout(() => {
// 			renderersToUnload.forEach((renderer) => {
// 				renderer.unload();
// 			});
// 		}, INTERVAL_MILLISECOND_TO_BE_DETACHED);
// 	}

// 	private createPreviewContainerEl(
// 		item: SearchResultItem,
// 		id: number
// 	): HTMLElement {
// 		const { contentEl } = this;
// 		const itemContainerEl = contentEl.createEl('div', {
// 			cls: 'item-container',
// 			attr: {
// 				'data-id': id,
// 				'data-path': item.file.path,
// 			},
// 		});
// 		itemContainerEl.createEl('div', {
// 			cls: 'file-name-container',
// 			text:
// 				item.file.extension === 'md'
// 					? item.file.basename
// 					: item.file.name, // extension is unnecessary because built-in search does not catch other formats
// 		});
// 		const previewMarginEl = itemContainerEl.createEl('div', {
// 			cls: 'preview-container-wrapper',
// 		});
// 		const previewContainerEl = previewMarginEl.createEl('div', {
// 			cls: 'preview-container',
// 		});
// 		if (this.plugin.settings?.hideIframe) {
// 			previewContainerEl.addClass('hide-iframe');
// 		}
// 		return previewContainerEl;
// 	}

// 	private getSelectedCardEl(el: HTMLElement): HTMLElement | undefined {
// 		const parentEl = el.parentElement;
// 		if (el.tagName === 'DIV' && parentEl === this.contentEl) {
// 			return el;
// 		}
// 		if (parentEl === null) {
// 			return undefined;
// 		}
// 		return this.getSelectedCardEl(parentEl);
// 	}

// 	private cardsPerPage(): number | undefined {
// 		if (!this.plugin.settings) {
// 			return undefined;
// 		}

// 		const [row, column] = parseCardLayout(
// 			this.plugin.settings.cardViewLayout
// 		);
// 		return row * column;
// 	}

// 	private get onCardItemClicked(): (evt: MouseEvent) => void {
// 		return (evt: MouseEvent) => {
// 			if (!(evt.target instanceof HTMLElement)) {
// 				return;
// 			}
// 			const cardEl = this.getSelectedCardEl(evt.target);
// 			if (!cardEl) {
// 				return;
// 			}
// 			const id = cardEl.dataset['id'];
// 			if (id === undefined) {
// 				return;
// 			}
// 			this.plugin.searchInterface?.open(Number.parseInt(id));
// 		};
// 	}

// 	// // delay detachment because otherwise ↓ occur
// 	// // "Uncaught TypeError: Cannot read property 'onResize' of null"
// 	// private detachLeafsLater() {
// 	// 	const leafsToBeDetached = this.leafs;
// 	// 	this.leafs = [];
// 	// 	setTimeout(() => {
// 	// 		leafsToBeDetached.forEach((leaf) => {
// 	// 			leaf.detach();
// 	// 		});
// 	// 	}, INTERVAL_MILLISECOND_TO_BE_DETACHED);
// 	// }

// 	// delay detachment because otherwise ↓ occur
// 	// "Uncaught TypeError: Cannot read property 'onResize' of null"

// 	// // id is necessary to open the selected item when clicked
// 	// private async renderItemByPreviewView(item: SearchResultItem, id: number) {
// 	// 	const previewContainerEl = this.createPreviewContainerEl(item, id);
// 	// 	const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
// 	// 	const markdownView = new MarkdownView(leaf);

// 	// 	markdownView.setMode(markdownView.modes.preview);
// 	// 	markdownView.file = item.file; // necessary to remove error message
// 	// 	markdownView.setViewData(item.content, true);
// 	// 	previewContainerEl.empty();
// 	// 	const previewView = markdownView.previewMode;
// 	// 	previewContainerEl.appendChild(previewView.containerEl);
// 	// 	previewView.renderer.previewEl.addClass('preview-container');
// 	// 	this.leafs.push(leaf);
// 	// }

// 	// private renderItems(items: SearchResultItem[]) {
// 	// 	if (items.length === 0) {
// 	// 		return;
// 	// 	}
// 	// 	this.leafs = [];
// 	// 	const { contentEl } = this;
// 	// 	contentEl.empty();
// 	// 	items.forEach((item, id) => {
// 	// 		const previewContainerEl = this.createPreviewContainerEl(item, id);

// 	// 		const leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
// 	// 		leaf.openFile(item.file, { state: { mode: 'preview' } });
// 	// 		previewContainerEl.appendChild(leaf.containerEl);

// 	// 		this.leafs.push(leaf);
// 	// 	});
// 	// 	this.reveal();
// 	// }
// }

// const supportedFileTypes = [
// 	'md',
// 	'png',
// 	'jpg',
// 	'jpeg',
// 	'gif',
// 	'bmp',
// 	'svg',
// 	'mp3',
// 	'webm',
// 	'wav',
// 	'm4a',
// 	'ogg',
// 	'3gp',
// 	'flac',
// 	'mp4',
// 	'ogv',
// 	'pdf',
// ];
