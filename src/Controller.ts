import CoreSearchAssistantPlugin from 'main';
import { App, Scope } from 'obsidian';
import { OptionModal } from 'OptionModal';
import { validOutlineWidth } from 'Setting';

export class Controller {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private scope: Scope | undefined;
	private currentPos = -1;
	private stackedPositions: number[];
	private coverEl: HTMLElement;
	cardViewDisplayed: boolean;
	inSearchMode: boolean;
	private searchResultsObserver: MutationObserver | undefined; // listen the search results rendered events
	private readonly observationConfig: MutationObserverInit = {
		childList: true,
	};

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.stackedPositions = [];
		this.coverEl = this.createOutline();
		this.cardViewDisplayed = false;
		this.app.workspace.onLayoutReady(() => {
			this.searchResultsObserver = new MutationObserver(
				this.onObservedCallback.bind(this)
			);
		});
		this.inSearchMode = false;
	}

	enter() {
		if (!this.scope) {
			this.scope = new Scope();
		}
		this.app.keymap.pushScope(this.scope);

		this.scope.register(['Ctrl'], 'N', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateForward();
			this.showWorkspacePreview();
			this.cardViewDisplayed = false;
			this.showCardView();
		});
		this.scope.register(['Ctrl'], 'P', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateBack();
			this.showWorkspacePreview();
			this.cardViewDisplayed = false;
			this.showCardView();
		});
		this.scope.register(['Mod'], 'Enter', () => {
			this.open();
		});
		this.scope.register(['Ctrl'], 'Enter', () => {
			this.preview();
		});
		this.scope.register(['Mod'], 'P', () => {
			new OptionModal(this.app, this.plugin).open();
		});
		this.scope.register([], 'Escape', () => {
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}
			inputEl.blur();
		});

		const childrenEl = this.plugin.coreSearchInterface?.getSearchView()?.dom
			.childrenEl as HTMLElement;
		this.searchResultsObserver?.observe(childrenEl, this.observationConfig);

		this.inSearchMode = true;

		this.showOutline();
	}

	reset() {
		this.forget();
		this.unfocus();
		this.plugin.cardView?.hide();
		this.cardViewDisplayed = false;
	}

	exit() {
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = undefined;
		}
		this.pushCurrentPos();
		this.unfocus();
		this.plugin?.workspacePreview?.hide();
		this.plugin.cardView?.hide();
		this.cardViewDisplayed = false;

		this.inSearchMode = false;

		this.hideOutline();
	}

	forget() {
		this.currentPos = -1;
		this.stackedPositions = [];
	}

	recall() {
		this.popCurrentPos();
		this.showWorkspacePreview();
		this.focus();
	}

	clean() {
		this.coverEl.remove();
	}

	showCardView() {
		if (this.cardViewDisplayed) {
			return;
		}
		if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
			return;
		}
		const items = this.plugin.coreSearchInterface?.getResultItems();
		if (items === undefined) {
			return;
		}
		this.plugin.cardView?.renew(items);
		this.cardViewDisplayed = true;
	}

	showWorkspacePreview() {
		if (this.plugin.settings?.autoPreviewMode !== 'singleView') {
			return;
		}

		const item = this.plugin.coreSearchInterface?.getResultItemAt(
			this.currentPos
		);
		if (!item) {
			return;
		}
		this.plugin?.workspacePreview?.renew(item.file);
	}

	private pushCurrentPos() {
		this.stackedPositions.push(this.currentPos);
		this.currentPos = -1;
	}

	private popCurrentPos() {
		this.currentPos = this.stackedPositions.pop() ?? -1;
	}

	private navigateForward() {
		const numResults = this.plugin.coreSearchInterface?.count() ?? 0;
		this.currentPos++;
		this.currentPos =
			this.currentPos < numResults ? this.currentPos : numResults - 1;
		this.focus();
	}

	private navigateBack() {
		this.currentPos--;
		this.currentPos = this.currentPos >= 0 ? this.currentPos : 0;

		this.focus();
	}

	private focus() {
		this.plugin.coreSearchInterface?.focusOn(this.currentPos);
	}

	private unfocus() {
		this.plugin.coreSearchInterface?.unfocus();
	}

	private preview() {
		this.plugin.coreSearchInterface?.preview(this.currentPos);
	}

	private open() {
		this.plugin.coreSearchInterface?.open(this.currentPos);
	}

	private createOutline(): HTMLElement {
		const coverEl = document.body.createEl('div', {
			cls: 'core-search-assistant_enter-mode',
		});
		coverEl.style.display = 'none';
		return coverEl;
	}

	private showOutline() {
		const outlineWidth = validOutlineWidth(
			this.plugin.settings?.outlineWidth
		);
		this.coverEl.style.outline = `${outlineWidth}px solid var(--interactive-accent)`;
		this.coverEl.style.outlineOffset = `-${outlineWidth}px`;
		this.coverEl.style.display = 'initial';
	}

	private hideOutline() {
		this.coverEl.style.display = 'none';
	}

	private onObservedCallback: MutationCallback = async (
		mutations: MutationRecord[],
		_observer: MutationObserver
	) => {
		for (const mutation of mutations) {
			if (mutation.addedNodes.length === 0) {
				continue;
			}
			console.log(mutation);
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
				document.dispatchEvent(new CustomEvent('shouldRenderSearch'));
				return;
			}
		}
	};
}
