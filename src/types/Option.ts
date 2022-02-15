import type { SORT_ORDER_IN_SEARCH } from 'types/Guards';

export const NON_SORT_OPTION_ID = [
	'matchingCase',
	'explainSearch',
	'collapseAll',
	'extraContext',
] as const;

export type SearchOptionId =
	| typeof NON_SORT_OPTION_ID[number]
	| typeof SORT_ORDER_IN_SEARCH[number];

interface SearchOptionInfo {
	iconId: string;
	description: string;
}

type SearchOptions = Record<SearchOptionId, SearchOptionInfo>;

export const searchOptions: SearchOptions = {
	matchingCase: {
		iconId: 'uppercase-lowercase-a',
		description: 'Toggle matching case',
	},
	explainSearch: {
		iconId: 'info',
		description: 'Toggle explanation of search term',
	},
	collapseAll: {
		iconId: 'bullet-list',
		description: 'Toggle collapsing results',
	},
	extraContext: {
		iconId: 'expand-vertically',
		description: 'Toggle showing more context',
	},
	alphabetical: {
		iconId: 'down-arrow-with-tail',
		description: 'Sort by file name (A → Z)',
	},
	alphabeticalReverse: {
		iconId: 'up-arrow-with-tail',
		description: 'Sort by file name (Z → A)',
	},
	byModifiedTime: {
		iconId: 'down-arrow-with-tail',
		description: 'Sort by modified time (new → old)',
	},
	byModifiedTimeReverse: {
		iconId: 'up-arrow-with-tail',
		description: 'Sort by modified time (old → new)',
	},
	byCreatedTime: {
		iconId: 'down-arrow-with-tail',
		description: 'Sort by created time (new → old)',
	},
	byCreatedTimeReverse: {
		iconId: 'up-arrow-with-tail',
		description: 'Sort by created time (old → new)',
	},
};
