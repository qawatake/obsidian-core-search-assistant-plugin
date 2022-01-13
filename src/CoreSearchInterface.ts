import MyPlugin from 'main';
import { ExampleModal } from 'Modal';
import { App, SearchComponent, TFile, View, WorkspaceLeaf } from 'obsidian';

export class CoreSearchInterface {
	app: App;
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		this.app = app;
		this.plugin = plugin;
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

	focusOn(pos: number) {
		this.unfocus();

		const item = this.getResultItemAt(pos);
		if (!item) {
			return;
		}
		item.containerEl.addClass('fake-hover');
		item.containerEl.scrollIntoView({ block: 'center' });
	}

	unfocus() {
		const items = this.getResultItems();
		items.forEach((item) => {
			item.containerEl.removeClass('fake-hover');
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
		new ExampleModal(this.app, this.plugin, item.file).open();
	}

	getSearchLeaf(): WorkspaceLeaf | undefined {
		const leafs = this.app.workspace.leftSplit.children[0]
			.children as WorkspaceLeaf[];

		return leafs.find((leaf) => {
			return leaf.view.getViewType() === 'search';
		});
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

interface SearchView extends View {
	matchingCase: boolean;
	explainSearch: boolean;

	setCollapseAll(collapseAll: boolean): void;

	setExplainSearch(explainSearch: boolean): void;

	setExtraContext(extraContext: boolean): void;

	setMatchingCase(matchingCase: boolean): void;

	setSortOrder(
		sortOrder:
			| 'alphabeticalReverse'
			| 'alphabetical'
			| 'byModifiedTime'
			| 'byModifiedTimeReverse'
			| 'byCreatedTime'
			| 'byCreatedTimeReverse'
	): void;

	dom: SearchDom;

	searchComponent: SearchComponent;
}

interface SearchDom {
	extraContext: boolean;
	collapseAll: boolean;
	sortOrder: string;
	children: SearchResultItem[];
}

interface SearchResultItem {
	file: TFile;
	containerEl: HTMLElement;
}

type UnknownObject<T extends object> = {
	[P in keyof T]: unknown;
};

function isSearchView(view: unknown): view is SearchView {
	if (typeof view !== 'object') {
		return false;
	}
	if (view === null) {
		return false;
	}

	const {
		matchingCase,
		explainSearch,
		dom,
		setCollapseAll,
		setExplainSearch,
		setExtraContext,
		setMatchingCase,
		setSortOrder,
		searchComponent,
	} = view as UnknownObject<SearchView>;

	if (typeof matchingCase !== 'boolean') {
		return false;
	}
	if (typeof explainSearch !== 'boolean') {
		return false;
	}
	if (!isSearchDom(dom)) {
		return false;
	}
	if (typeof searchComponent !== 'object') {
		return false;
	}
	// SearchComponent is undefined at obsidian 0.13.19 (installer version 0.11.13)
	// if (!(searchComponent instanceof SearchComponent)) {
	// 	return false;
	// }
	if (!(setCollapseAll instanceof Function)) {
		return false;
	}
	if (!(setExplainSearch instanceof Function)) {
		return false;
	}
	if (!(setExtraContext instanceof Function)) {
		return false;
	}
	if (!(setMatchingCase instanceof Function)) {
		return false;
	}
	if (!(setSortOrder instanceof Function)) {
		return false;
	}

	return true;
}

function isSearchDom(obj: unknown): obj is SearchDom {
	if (typeof obj !== 'object') {
		return false;
	}
	if (obj === null) {
		return false;
	}

	const { extraContext, collapseAll, sortOrder, children } =
		obj as UnknownObject<SearchDom>;

	if (typeof extraContext !== 'boolean') {
		return false;
	}
	if (typeof collapseAll !== 'boolean') {
		return false;
	}
	if (typeof sortOrder !== 'string') {
		return false;
	}
	if (
		![
			'alphabeticalReverse',
			'alphabetical',
			'byModifiedTime',
			'byModifiedTimeReverse',
			'byCreatedTime',
			'byCreatedTimeReverse',
		].includes(sortOrder)
	) {
		return false;
	}
	if (typeof children !== 'object') {
		return false;
	}
	if (!(children instanceof Array)) {
		return false;
	}

	return true;
}
