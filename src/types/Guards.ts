import {
	type SearchDom,
	type SearchResultItem,
	type SearchResultItemGroup,
	type SearchView,
	type SortOrderInSearch,
	TFile,
} from 'obsidian';

export type UnknownObject<T extends object> = {
	[P in keyof T]: unknown;
};

export const SORT_ORDER_IN_SEARCH = [
	'alphabeticalReverse',
	'alphabetical',
	'byModifiedTime',
	'byModifiedTimeReverse',
	'byCreatedTime',
	'byCreatedTimeReverse',
] as const;

export function isSearchView(view: unknown): view is SearchView {
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
		searchInfoEl,
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
	if (typeof searchInfoEl !== 'object') {
		return false;
	}
	if (!(searchInfoEl instanceof HTMLDivElement)) {
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

	const { extraContext, collapseAll, sortOrder, vChildren, childrenEl } =
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
	if (!SORT_ORDER_IN_SEARCH.includes(sortOrder as SortOrderInSearch)) {
		return false;
	}
	if (!isSearchResultItemGroup(vChildren)) {
		return false;
	}
	if (typeof childrenEl !== 'object') {
		return false;
	}
	if (!(childrenEl instanceof HTMLElement)) {
		return false;
	}

	return true;
}

function isSearchResultItemGroup(obj: unknown): obj is SearchResultItemGroup {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}

	const { _children: children } = obj as SearchResultItemGroup;
	if (typeof children !== 'object') {
		return false;
	}
	if (!(children instanceof Array)) {
		return false;
	}
	for (const child of children) {
		if (!isSearchResultItem(child)) {
			return false;
		}
	}
	return true;
}

function isSearchResultItem(obj: unknown): obj is SearchResultItem {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}

	const { file, containerEl } = obj as UnknownObject<SearchResultItem>;

	if (!(file instanceof TFile)) {
		return false;
	}
	if (!(containerEl instanceof HTMLElement)) {
		return false;
	}

	return true;
}
