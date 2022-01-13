import MyPlugin from 'main';
import { App, Scope } from 'obsidian';

export class Controller {
	private app: App;
	private plugin: MyPlugin;
	private scope: Scope | undefined;
	private currentFocused = -1;
	private StackedPositions: number[];

	constructor(app: App, plugin: MyPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.StackedPositions = [];
	}

	setup(): Controller {
		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}
			this.plugin.registerDomEvent(inputEl as HTMLElement, 'blur', () => {
				if (this.scope) {
					this.app.keymap.popScope(this.scope);
					this.scope = undefined;
				}
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
			this.plugin.registerDomEvent(
				inputEl as HTMLElement,
				'focus',
				() => {
					this.setKeymap();
				}
			);
		});

		return this;
	}

	setKeymap() {
		if (!this.scope) {
			this.scope = new Scope();
		}
		this.app.keymap.pushScope(this.scope);

		this.scope.register(['Ctrl'], 'N', () => {
			if (!this.hasFocusOnSearchInput()) {
				return;
			}
			this.navigateForward();
		});
		this.scope.register(['Ctrl'], 'P', () => {
			if (!this.hasFocusOnSearchInput()) {
				return;
			}
			this.navigateBack();
		});
		this.scope.register(['Mod'], 'Enter', () => {
			if (!(this.hasFocusOnSearchInput() && this.currentFocused >= 0)) {
				return;
			}
			this.choose();
		});
		this.scope.register(['Ctrl'], 'Enter', () => {
			if (!(this.hasFocusOnSearchInput() && this.currentFocused >= 0)) {
				return;
			}
			this.showPreviewModal();
		});
		this.scope.register([], 'Escape', () => {
			console.log('a');
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}
			inputEl.blur();
		});
	}

	clean() {}

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
		const numResults = this.plugin.coreSearchInterface?.count() ?? 0;
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
		this.plugin.coreSearchInterface?.focusOn(this.currentFocused);
	}

	unfocus() {
		this.plugin.coreSearchInterface?.unfocus();
	}

	showPreviewModal() {
		this.plugin.coreSearchInterface?.preview(this.currentFocused);
	}

	choose() {
		this.plugin.coreSearchInterface?.open(this.currentFocused);
	}

	hasFocusOnSearchInput(): boolean {
		const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
		if (!inputEl) {
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
}
