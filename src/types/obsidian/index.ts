import type { Plugin } from 'obsidian';
import type { SORT_ORDER_IN_SEARCH } from 'types/Guards';

export * from 'obsidian';

declare module 'obsidian' {
	interface App {
		dom: AppDom;
		plugins: { plugins: PluginMap };
	}

	type PluginMap = {
		[pluginId: string]: Plugin;
	};

	interface AppDom {
		appContainerEl: HTMLElement;
	}

	interface Vault {
		config: BuiltInConfig;
	}

	interface BuiltInConfig {
		legacyEditor: boolean;
	}

	interface WorkspaceLeaf {
		id: string;
		containerEl: HTMLElement;
		tabHeaderEl: HTMLElement;
	}

	interface WorkspaceSidedock {
		children: WorkspaceSidedockTabParent[];
	}

	interface WorkspaceSidedockTabParent {
		children: WorkspaceLeaf[];
		type: 'tabs';
	}

	interface SearchView extends View {
		matchingCase: boolean;
		explainSearch: boolean;

		setCollapseAll(collapseAll: boolean): void;

		setExplainSearch(explainSearch: boolean): void;

		setExtraContext(extraContext: boolean): void;

		setMatchingCase(matchingCase: boolean): void;

		setSortOrder(sortOrder: SortOrderInSearch): void;

		dom: SearchDom;

		searchInfoEl: HTMLElement;
		matchingCaseButtonEl: HTMLElement;

		searchComponent: SearchComponent;
		headerDom: SearchHeaderDom;
	}

	type SortOrderInSearch = typeof SORT_ORDER_IN_SEARCH[number];

	interface SearchDom {
		extraContext: boolean;
		collapseAll: boolean;
		sortOrder: SortOrderInSearch;
		children: SearchResultItem[];
		childrenEl: HTMLElement;
	}

	interface SearchResultItem {
		file: TFile;
		content: string;
		containerEl: HTMLElement;
		result: SearchResultMatchInfo;
	}

	interface SearchResultMatchInfo {
		filename?: SearchMatches;
		content?: SearchMatches;
	}

	interface SearchHeaderDom {
		navButtonsEl: HTMLDivElement;
	}

	interface WorkspaceSplit {
		containerEl: HTMLElement;
	}

	interface Editor {
		addHighlights(ranges: EditorRange[], cls: string): void;
		removeHighlights(cls: string): void;
	}
}
