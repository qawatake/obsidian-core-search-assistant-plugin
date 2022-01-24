import CoreSearchAssistantPlugin from 'main';
import {
	App,
	Component,
	Events,
	SearchResultItem,
	SearchView,
	SortOrderInSearch,
	SplitDirection,
	WorkspaceLeaf,
	WorkspaceSidedock,
} from 'obsidian';
import { isSearchView } from 'types/Guards';
import { searchOptions } from 'types/Option';
import { LinkedList } from 'utils/LinkedList';
import { EVENT_SEARCH_RESULT_ITEM_DETECTED } from 'Events';

export class SearchComponentInterface extends Component {
	app: App;
	plugin: CoreSearchAssistantPlugin;
	private sortOrderContainerEl: HTMLElement | undefined;
	private sortOrderContentEl: HTMLElement | undefined;

	// watch search results to be rendered
	private observer: MutationObserver;
	private readonly observationConfig: MutationObserverInit = {
		childList: true,
	};
	private linkedList: LinkedList<HTMLElement> | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;

		this.observer = new MutationObserver(
			this.onObservedCallback.bind(this)
		);
	}

	override onload(): void {
		// ↓ necessary to display sort order info at start up
		this.app.workspace.onLayoutReady(() => {
			this.renewSortOrderInfo();

			this.registerDomEvent(document, 'click', () => {
				this.renewSortOrderInfo();
				// this.plugin.controller?.reset(); // it unexpectedly reloads when clicking close button of modals
			});
		});
	}

	override onunload(): void {
		this.sortOrderContainerEl?.empty();
		this.sortOrderContainerEl?.remove();
		this.observer.disconnect();
	}

	toggleMatchingCase() {
		const view = this.getSearchView();
		view?.setMatchingCase(!view.matchingCase);
	}

	toggleExplainSearch() {
		const view = this.getSearchView();
		view?.setExplainSearch(!view.explainSearch);
	}

	toggleCollapseAll() {
		const view = this.getSearchView();
		view?.setCollapseAll(!view.dom.collapseAll);
	}

	toggleExtraContext() {
		const view = this.getSearchView();
		view?.setExtraContext(!view.dom.extraContext);
	}

	setSortOrder(sortOrder: SortOrderInSearch): SortOrderChanged {
		const view = this.getSearchView();
		const originalOrder = view?.dom.sortOrder;
		view?.setSortOrder(sortOrder);
		return sortOrder !== originalOrder;
	}

	focusOn(pos: number) {
		this.unfocus();

		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		item.containerEl.addClass(
			'core-search-assistant_search-result-items-focus'
		);
		item.containerEl.scrollIntoView(
			this.plugin.settings?.keepSelectedItemsCentered
				? { block: 'center' }
				: { block: 'nearest' }
		);
	}

	unfocus() {
		const items = this.getResultItems();
		items.forEach((item) => {
			item.containerEl.removeClass(
				'core-search-assistant_search-result-items-focus'
			);
		});
	}

	open(pos: number, direction?: SplitDirection) {
		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		const { file } = item;
		const leaf =
			direction === undefined
				? this.app.workspace.getMostRecentLeaf()
				: this.app.workspace.splitActiveLeaf(direction);
		leaf.openFile(file);
		this.app.workspace.setActiveLeaf(leaf, true, true);
	}

	renewSortOrderInfo(): void {
		if (!this.sortOrderContainerEl) {
			this.createSortOrderEls();
		}
		const view = this.getSearchView();
		if (!view) {
			return;
		}
		const sortOrder = view.dom.sortOrder;
		if (!this.sortOrderContentEl) {
			return;
		}
		this.sortOrderContentEl.textContent =
			searchOptions[sortOrder].description;
	}

	count(): number {
		const results = this.getSearchView()?.dom.children;
		if (!results) {
			return 0;
		}
		return results.length;
	}

	getResultItems(): SearchResultItem[] {
		return this.getSearchView()?.dom.children ?? [];
	}

	getResultItemAt(pos: number): SearchResultItem | undefined {
		return this.getSearchView()?.dom.children[pos];
	}

	getSearchInput(): HTMLInputElement | undefined {
		return this.getSearchView()?.searchComponent.inputEl;
	}

	startWatching(events: Events) {
		// reset
		this.linkedList = new LinkedList(
			events,
			EVENT_SEARCH_RESULT_ITEM_DETECTED
		);

		const childrenContainerEl =
			this.plugin.SearchComponentInterface?.getSearchView()?.dom
				.childrenEl as HTMLElement;
		this.observer.observe(childrenContainerEl, this.observationConfig);
	}

	stopWatching() {
		this.observer.disconnect();
	}

	private createSortOrderEls(): void {
		// create element
		this.sortOrderContainerEl = createEl('div', {
			cls: 'search-info-container',
		});
		this.sortOrderContentEl = this.sortOrderContainerEl.createEl('div');

		// insert created element
		const view = this.getSearchView();
		if (!view) {
			return undefined;
		}
		this.sortOrderContainerEl.insertAfter(view.searchInfoEl);
	}

	private getSearchView(): SearchView | undefined {
		const leaf = this.getSearchLeaf();
		if (!leaf) {
			return undefined;
		}

		const view = leaf.view;
		return isSearchView(view) ? view : undefined;
	}

	private getSearchLeaf(): WorkspaceLeaf | undefined {
		const sideDocks = [
			this.app.workspace.leftSplit,
			this.app.workspace.rightSplit,
		];
		for (const sideDock of sideDocks) {
			// const sideDock = this.app.workspace.leftSplit;
			if (!(sideDock instanceof WorkspaceSidedock)) {
				return undefined;
			}
			const leafs = sideDock.children[0]?.children as WorkspaceLeaf[];

			const searchLeaf = leafs.find((leaf) => {
				return leaf.view.getViewType() === 'search';
			});
			if (searchLeaf !== undefined) {
				return searchLeaf;
			}
		}
		return undefined;
	}

	private onObservedCallback: MutationCallback = async (
		mutations: MutationRecord[],
		_observer: MutationObserver
	) => {
		for (const mutation of mutations) {
			if (mutation.addedNodes.length === 0) {
				continue;
			}
			const pre = mutation.previousSibling;
			if (!(pre instanceof HTMLElement)) {
				continue;
			}
			for (const node of Array.from(mutation.addedNodes)) {
				if (!(node instanceof HTMLElement)) {
					continue;
				}
				const isSearchResultItem =
					node.tagName === 'DIV' &&
					node.hasClass('tree-item') &&
					node.hasClass('search-result');
				if (!isSearchResultItem) {
					continue;
				}
				if (!this.linkedList) {
					return;
				}
				this.linkedList.structure(
					node,
					this.isRootSearchResult(pre) ? undefined : pre
				);
			}
		}
	};

	private isRootSearchResult(el: HTMLElement): boolean {
		return (
			el.tagName === 'DIV' &&
			!el.hasClass('tree-item') &&
			!el.hasClass('search-result')
		);
	}

	// async watchSortOrderChangeByClick() {
	// 	const callback = async (evt: Event) => {
	// 		this.renewSortOrderInfo();
	// 		if (evt.currentTarget === null) {
	// 			return;
	// 		}
	// 		evt.currentTarget.removeEventListener('click', callback);
	// 	};
	// 	await new Promise((resolve) => setTimeout(resolve, 1)); // prevent callback from being called immediately
	// 	document.addEventListener('click', callback);
	// }

	// getSortOrderSettingButton(): HTMLElement | undefined {
	// 	const view = this.getSearchView();
	// 	const buttonsEl = view?.headerDom.navButtonsEl;
	// 	if (!buttonsEl) {
	// 		return undefined;
	// 	}
	// 	const sortOrderSettingButtonEl = buttonsEl.querySelector(
	// 		'div.nav-action-button[aria-label="Change sort order"]'
	// 	);
	// 	return sortOrderSettingButtonEl
	// 		? (sortOrderSettingButtonEl as HTMLElement)
	// 		: undefined;
	// }
}

// will be used to indicate if reloading card view is needed
type SortOrderChanged = boolean;
