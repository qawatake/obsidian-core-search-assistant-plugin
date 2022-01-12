import { App, View, WorkspaceLeaf } from 'obsidian';

export class searchAnalyzer {
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
}

interface SearchView extends View {
	setCollapseAll: (_collapseAll: boolean) => void;

	setExplainSearch: (_explainSearch: boolean) => void;

	setExtraContext: (_extraContext: boolean) => void;

	setMatchingCase: (_matchingCase: boolean) => void;

	setSortOrder: (
		_sortOrder:
			| 'alphabeticalReverse'
			| 'alphabetical'
			| 'byModifiedTime'
			| 'byModifiedTimeReverse'
			| 'byCreatedTime'
			| 'byCreatedTimeReverse'
	) => void;
}
