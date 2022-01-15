import CoreSearchAssistantPlugin from 'main';
import { PreviewModal } from 'PreviewModal';
import {
	App,
	SearchResultItem,
	SearchView,
	SortOrderInSearch,
	WorkspaceLeaf,
	WorkspaceSidedock,
} from 'obsidian';
import { isSearchView } from 'types/Guards';
import { searchOptions } from 'types/Option';

export class CoreSearchInterface {
	app: App;
	plugin: CoreSearchAssistantPlugin;
	sortOrderContainerEl: HTMLElement | undefined;
	sortOrderContentEl: HTMLElement | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.app.workspace.onLayoutReady(() => {
			this.renewSortOrderInfo();
		});
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

	setSortOrder(sortOrder: SortOrderInSearch) {
		const view = this.getSearchView();
		view?.setSortOrder(sortOrder);
	}

	focusOn(pos: number) {
		this.unfocus();

		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		item.containerEl.addClass('core-search-assistant_search_result_items');
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
				'core-search-assistant_search_result_items'
			);
		});
	}

	open(pos: number) {
		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		const fileNameEl = item.containerEl.querySelector('div.tree-item-self');
		if (fileNameEl === null) {
			return;
		}
		(fileNameEl as HTMLElement).click();
	}

	preview(pos: number) {
		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		new PreviewModal(this.app, this.plugin, item.file).open();
	}

	getSearchLeaf(): WorkspaceLeaf | undefined {
		const sideDock = this.app.workspace.leftSplit;
		if (!(sideDock instanceof WorkspaceSidedock)) {
			return undefined;
		}
		const leafs = sideDock.children[0]?.children as WorkspaceLeaf[];

		return leafs.find((leaf) => {
			return leaf.view.getViewType() === 'search';
		});
	}

	clean() {
		this.removeSortOrderContainerEl();
	}

	createSortOrderEls(): void {
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

	removeSortOrderContainerEl(): void {
		this.sortOrderContainerEl?.remove();
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

	getSearchView(): SearchView | undefined {
		const leaf = this.getSearchLeaf();
		if (!leaf) {
			return undefined;
		}

		const view = leaf.view;
		return isSearchView(view) ? view : undefined;
	}
}
