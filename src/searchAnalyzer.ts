import { App, View, WorkspaceLeaf } from 'obsidian';

export class SearchAnalyzer {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	getSearchLeaf(): WorkspaceLeaf | undefined {
		const leafs = this.app.workspace.leftSplit.children[0]
			.children as WorkspaceLeaf[];

		return leafs.find((leaf) => {
			return leaf.view.getViewType() === 'search';
		});
	}

	// getSearchInput():

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
}

interface SearchDom {
	extraContext: boolean;
	collapseAll: boolean;
	sortOrder: string;
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

	const { extraContext, collapseAll, sortOrder } =
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
	return true;
}
