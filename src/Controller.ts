import MyPlugin from 'main';
import { ExampleModal } from 'Modal';
import { App, KeymapEventHandler } from 'obsidian';

export class Controller {
	private app: App;
	private plugin: MyPlugin;
	private currentFocused = -1;
	private StackedPositions: number[];
	private keymapHandlers: KeymapEventHandler[];

	constructor(app: App, plugin: MyPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.keymapHandlers = [];
		this.StackedPositions = [];
	}

	setup(): Controller {
		this.keymapHandlers.push(
			this.app.scope.register(['Ctrl'], 'N', () => {
				if (!this.hasFocusOnSearchInput()) {
					return;
				}
				this.navigateForward();
			})
		);
		this.keymapHandlers.push(
			this.app.scope.register(['Ctrl'], 'P', () => {
				if (!this.hasFocusOnSearchInput()) {
					return;
				}
				this.navigateBack();
			})
		);
		this.keymapHandlers.push(
			this.app.scope.register(['Mod', 'Shift'], 'Enter', () => {
				if (
					!(this.hasFocusOnSearchInput() && this.currentFocused >= 0)
				) {
					return;
				}
				this.choose();
			})
		);
		this.keymapHandlers.push(
			this.app.scope.register(['Ctrl'], 'Enter', () => {
				if (
					!(this.hasFocusOnSearchInput() && this.currentFocused >= 0)
				) {
					return;
				}
				this.showPreviewModal();
			})
		);

		this.app.workspace.onLayoutReady(() => {
			const { containerEl } = this.app.workspace.leftSplit;
			if (!(containerEl instanceof HTMLElement)) {
				return;
			}
			const inputEl = containerEl.querySelector(
				'div.search-input-container > input'
			);
			if (inputEl === null) {
				return;
			}
			this.plugin.registerDomEvent(inputEl as HTMLElement, 'blur', () => {
				this.pushCurrentFocused();
				this.unfocus();
			});
			this.plugin.registerDomEvent(
				inputEl as HTMLElement,
				'input',
				() => {
					this.forget();
					this.unfocus();
				}
			);
		});

		return this;
	}

	clean() {
		this.keymapHandlers.forEach((handler) => {
			this.app.scope.unregister(handler);
		});
	}

	forget() {
		this.currentFocused = -1;
		this.StackedPositions = [];
	}

	pushCurrentFocused() {
		this.StackedPositions.push(this.currentFocused);
		this.currentFocused = -1;
	}

	popCurrentFocused() {
		this.currentFocused = this.StackedPositions.pop() ?? -1;
	}

	navigateForward() {
		const resultsContainerEl = this.findSearchLeaf()?.querySelector(
			'div.search-results-children'
		);
		const resultEls = resultsContainerEl?.querySelectorAll(
			'div.search-result-file-title'
		);
		const numResults = resultEls?.length ?? 0;
		this.currentFocused++;
		this.currentFocused =
			this.currentFocused < numResults
				? this.currentFocused
				: numResults - 1;
		this.focus();
	}

	navigateBack() {
		this.currentFocused--;
		this.currentFocused =
			this.currentFocused >= 0 ? this.currentFocused : 0;

		this.focus();
	}

	focus() {
		const resultsContainerEl = this.findSearchLeaf()?.querySelector(
			'div.search-results-children'
		);
		const resultEls = resultsContainerEl?.querySelectorAll(
			'div.search-result-file-title'
		);
		resultEls?.forEach((el, i) => {
			if (this.currentFocused === i) {
				el.addClass('fake-hover');
				el.scrollIntoView({ block: 'center' });
			} else {
				el.removeClass('fake-hover');
			}
		});
	}

	unfocus() {
		const resultsContainerEl = this.findSearchLeaf()?.querySelector(
			'div.search-results-children'
		);
		const resultEls = resultsContainerEl?.querySelectorAll(
			'div.search-result-file-title'
		);
		resultEls?.forEach((el) => {
			el.removeClass('fake-hover');
		});
	}

	showPreviewModal() {
		const resultsContainerEl = this.findSearchLeaf()?.querySelector(
			'div.search-results-children'
		);
		const resultEls = resultsContainerEl?.querySelectorAll(
			'div.search-result-file-title'
		);
		if (resultEls === undefined) {
			return;
		}

		const resultEl = resultEls[this.currentFocused] as HTMLElement;
		const filenameEl = resultEl.querySelector('div.tree-item-inner');
		console.log(filenameEl?.textContent);
		const filename = filenameEl?.textContent;
		const file = this.app.metadataCache.getFirstLinkpathDest(
			filename as string,
			'/'
		);
		if (file === null) {
			return;
		}
		new ExampleModal(this.app, this.plugin, file).open();
	}

	choose() {
		const resultsContainerEl = this.findSearchLeaf()?.querySelector(
			'div.search-results-children'
		);
		const resultEls = resultsContainerEl?.querySelectorAll(
			'div.search-result-file-title'
		);
		if (resultEls === undefined) {
			return;
		}
		(resultEls[this.currentFocused] as HTMLElement)?.click();
	}

	hasFocusOnSearchInput(): boolean {
		const { containerEl } = this.app.workspace.leftSplit;
		if (!(containerEl instanceof HTMLElement)) {
			return false;
		}
		const inputEl = containerEl.querySelector(
			'div.search-input-container > input'
		);
		if (inputEl === null) {
			return false;
		}
		if (!document.hasFocus()) {
			return false;
		}
		if (document.activeElement !== inputEl) {
			return false;
		}
		return true;
	}

	findSearchLeaf(): HTMLElement | undefined {
		const leafs = this.app.workspace.leftSplit.children[0].children as {
			containerEl: HTMLElement;
		}[];
		return leafs.find((leaf) => {
			const { containerEl } = leaf;
			const inputEl = containerEl.querySelector(
				'div.workspace-leaf-content[data-type="search"]'
			);
			return inputEl !== null;
		})?.containerEl;
	}
}
