import MyPlugin from 'main';
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
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
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
