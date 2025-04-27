import {
	type CoreSearchAssistantEvents,
	EVENT_SEARCH_RESULT_ITEM_DETECTED,
	EVENT_SORT_ORDER_CHANGED,
} from 'Events';
import type CoreSearchAssistantPlugin from 'main';
import {
	type App,
	Component,
	type Events,
	type SearchResultItem,
	type SearchView,
	type SortOrderInSearch,
	type SplitDirection,
	type WorkspaceLeaf,
	WorkspaceSidedock,
} from 'obsidian';
import { isSearchView } from 'types/Guards';
import { searchOptions } from 'types/Option';
import { LinkedList } from 'utils/LinkedList';

export class SearchComponentInterface extends Component {
	private readonly app: App;
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly events: CoreSearchAssistantEvents;
	private sortOrderContainerEl: HTMLElement | undefined;
	private sortOrderContentEl: HTMLElement | undefined;

	// watch search results to be rendered
	private observer: MutationObserver;
	private readonly observationConfig: MutationObserverInit = {
		childList: true,
	};
	private linkedList: LinkedList<HTMLElement> | undefined;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		events: CoreSearchAssistantEvents
	) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.events = events;

		this.observer = new MutationObserver(
			this.onObservedCallback.bind(this)
		);
	}

	override onload(): void {
		// ↓ necessary to display sort order info at start up
		this.app.workspace.onLayoutReady(() => {
			this.renewSortOrderInfo();

			this.registerDomEvent(document, 'click', () => {
				this.renewSortOrderInfo(this.events);
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
		const view = this.searchView;
		view?.setMatchingCase(!view.matchingCase);
	}

	toggleExplainSearch() {
		const view = this.searchView;
		view?.setExplainSearch(!view.explainSearch);
	}

	toggleCollapseAll() {
		const view = this.searchView;
		view?.setCollapseAll(!view.dom.collapseAll);
	}

	toggleExtraContext() {
		const view = this.searchView;
		view?.setExtraContext(!view.dom.extraContext);
	}

	setSortOrder(sortOrder: SortOrderInSearch): SortOrderChanged {
		const view = this.searchView;
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
		const items = this.resultItems;
		items.forEach((item) => {
			item.containerEl.removeClass(
				'core-search-assistant_search-result-items-focus'
			);
		});
	}

	async open(pos: number, direction?: SplitDirection) {
		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		const { file } = item;
		const leaf =
			direction === undefined
				? this.app.workspace.getMostRecentLeaf()
				: this.app.workspace.splitActiveLeaf(direction);
		await leaf.openFile(file);
		this.app.workspace.setActiveLeaf(leaf, true, true);
	}

	renewSortOrderInfo(events?: CoreSearchAssistantEvents): void {
		if (!this.sortOrderContainerEl) {
			this.createSortOrderEls();
		}
		const view = this.searchView;
		if (!view) {
			return;
		}
		const sortOrder = view.dom.sortOrder;
		if (!this.sortOrderContentEl) {
			return;
		}
		const originalContent = this.sortOrderContentEl.textContent;
		this.sortOrderContentEl.textContent =
			searchOptions[sortOrder].description;
		if (
			events !== undefined &&
			originalContent !== this.sortOrderContentEl.textContent
		) {
			events.trigger(EVENT_SORT_ORDER_CHANGED);
		}
	}

	count(): number {
		const results = this.searchView?.dom.vChildren._children;
		if (!results) {
			return 0;
		}
		return results.length;
	}

	get resultItems(): SearchResultItem[] {
		return this.searchView?.dom.vChildren._children ?? [];
	}

	getResultItemAt(pos: number): SearchResultItem | undefined {
		return this.searchView?.dom.vChildren._children[pos];
	}

	get searchInputEl(): HTMLInputElement | undefined {
		return this.searchView?.searchComponent.inputEl;
	}

	startWatching(events: Events) {
		// reset
		this.linkedList = new LinkedList(
			events,
			EVENT_SEARCH_RESULT_ITEM_DETECTED
		);

		const childrenContainerEl = this.searchView?.dom.childrenEl;
		if (!(childrenContainerEl instanceof HTMLElement)) {
			throw '[ERROR in Core Search Assistant] failed to SearchComponentInterface#startWatching: childrenContainerEl is not an instance of HTMLElement';
		}
		this.observer.observe(childrenContainerEl, this.observationConfig);
	}

	stopWatching() {
		this.observer.disconnect();
	}

	collapseOppositeSidedock() {
		const sideDock = this.oppositeSidedock;
		if (sideDock === undefined) {
			throw '[ERROR in Core Search Assistant] failed to collapseOppositeSidedock: failed to fetch the opposite sidedock';
		}
		sideDock.collapse();
	}

	expandOppositeSidedock() {
		const sideDock = this.oppositeSidedock;
		if (sideDock === undefined) {
			throw '[ERROR in Core Search Assistant] failed to expandOppositeSidedock: failed to fetch the opposite sidedock';
		}
		sideDock.expand();
	}

	collapseSidedock() {
		const sideDock = this.sideDock;
		if (sideDock === undefined) {
			throw '[ERROR in Core Search Assistant] failed to collapseSidedock: failed to fetch the sidedock';
		}
		sideDock.collapse();
	}

	get sideDock(): WorkspaceSidedock | undefined {
		const leaf = this.searchLeaf;
		if (leaf === undefined) {
			return undefined;
		}
		const parent = leaf.getRoot();
		if (parent instanceof WorkspaceSidedock) {
			return parent;
		}
		return undefined;
	}

	get oppositeSidedock(): WorkspaceSidedock | undefined {
		const leaf = this.searchLeaf;
		if (leaf === undefined) {
			return undefined;
		}
		const parent = leaf.getRoot();
		if (parent === this.app.workspace.leftSplit) {
			const opposite = this.app.workspace.rightSplit;
			return opposite instanceof WorkspaceSidedock ? opposite : undefined;
		}
		if (parent === this.app.workspace.rightSplit) {
			const opposite = this.app.workspace.leftSplit;
			return opposite instanceof WorkspaceSidedock ? opposite : undefined;
		}
		return undefined;
	}

	private createSortOrderEls(): void {
		// create element
		this.sortOrderContainerEl = createEl('div', {
			cls: 'search-info-container',
		});
		this.sortOrderContentEl = this.sortOrderContainerEl.createEl('div');

		// insert created element
		const view = this.searchView;
		if (!view) {
			return;
		}
		this.sortOrderContainerEl.insertAfter(view.searchInfoEl);
	}

	get matchingCaseButtonEl(): HTMLElement | undefined {
		return this.searchView?.matchingCaseButtonEl;
	}

	get tabHeaderEl(): HTMLElement | undefined {
		return this.searchLeaf?.tabHeaderEl;
	}

	isBuiltInElementToOpenFile(el: HTMLElement): boolean {
		const isFileNameContainerEl =
			el.tagName === 'DIV' && el.hasClass('tree-item-inner');
		const isMatchCountContainerEl =
			el.tagName === 'DIV' && el.hasClass('tree-item-flair-outer');
		const isMatchContainerEl =
			el.tagName === 'DIV' && el.hasClass('search-result-file-match');
		if (
			isFileNameContainerEl ||
			isMatchContainerEl ||
			isMatchCountContainerEl
		) {
			return true;
		}

		const parentEl = el.parentElement;
		if (parentEl === null) {
			return false;
		}
		// recursive
		return this.isBuiltInElementToOpenFile(parentEl);
	}

	isShowMoreContextButton(el: HTMLElement): boolean {
		return (
			el.tagName === 'DIV' && el.hasClass('search-result-hover-button')
		);
	}

	// get changeSortOrderButtonEl(): HTMLElement | undefined {
	// 	const changeSortOrderButtonEl =
	// 		this.searchView?.headerDom.navButtonsEl.querySelector(
	// 			'div.nav-action-button[aria-label="Change sort order"]'
	// 		);
	// 	return changeSortOrderButtonEl instanceof HTMLElement
	// 		? changeSortOrderButtonEl
	// 		: undefined;
	// }

	private get searchView(): SearchView | undefined {
		const leaf = this.searchLeaf;
		if (!leaf) {
			return undefined;
		}
		const view = leaf.view;
		return isSearchView(view) ? view : undefined;
	}

	get searchLeaf(): WorkspaceLeaf | undefined {
		return this.app.workspace.getLeavesOfType('search')[0];
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
