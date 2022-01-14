import MyPlugin from 'main';
import { ExampleModal } from 'Modal';
import {
	App,
	SearchResultItem,
	SearchView,
	WorkspaceLeaf,
	WorkspaceSidedock,
} from 'obsidian';
import { isSearchView } from 'types/Guards';

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
		const sideDock = this.app.workspace.leftSplit;
		if (!(sideDock instanceof WorkspaceSidedock)) {
			return undefined;
		}
		const leafs = sideDock.children[0]?.children as WorkspaceLeaf[];

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
