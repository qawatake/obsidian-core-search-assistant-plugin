import { SORT_ORDER_IN_SEARCH } from 'types/Guards';

export * from 'obsidian';

declare module 'obsidian' {
	interface App {
		hotkeyManager: HotkeyManager;
		dom: AppDom;
	}

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
		filename?: Match[];
		content?: Match[];
	}

	type Match = [number, number];

	interface SearchHeaderDom {
		navButtonsEl: HTMLDivElement;
	}

	interface WorkspaceSplit {
		containerEl: HTMLElement;
	}

	interface MarkdownPreviewView {
		view: PreviewView;
		renderer: PreviewRenderer;
	}

	interface PreviewView {
		file: TFile;
	}

	interface PreviewRenderer {
		previewEl: HTMLElement;
	}

	interface MarkdownView {
		// editMode: MarkdownEditorView; not found in the legacy editor
		getMode(): MarkdownViewModeType;
		setMode(mode: MarkdownPreviewView | MarkdownEditView): void;
		modes: MarkdownViewModes;
		currentMode: MarkdownSubView;
	}

	interface MarkdownViewModes {
		preview: MarkdownPreviewView;
		source: MarkdownEditView;
	}

	interface MarkdownEditView {
		editor: Editor;
		contentContainerEl: HTMLElement;
	}

	interface Editor {
		addHighlights(ranges: EditorRange[], cls: string): void;
		removeHighlights(cls: string): void;
	}

	interface HotkeyManager {
		customKeys: { [commandId: string]: Hotkey[] };
		defaultKeys: { [commandId: string]: Hotkey[] };
	}
}
