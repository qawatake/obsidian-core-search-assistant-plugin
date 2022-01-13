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

	enter() {
		if (!this.scope) {
			this.scope = new Scope();
		}
		this.app.keymap.pushScope(this.scope);

		this.scope.register(['Ctrl'], 'N', () => {
			this.navigateForward();
		});
		this.scope.register(['Ctrl'], 'P', () => {
			this.navigateBack();
		});
		this.scope.register(['Mod'], 'Enter', () => {
			this.open();
		});
		this.scope.register(['Ctrl'], 'Enter', () => {
			this.preview();
		});
		this.scope.register([], 'Escape', () => {
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}
			inputEl.blur();
		});
	}

	reset() {
		this.forget();
		this.unfocus();
	}

	exit() {
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = undefined;
		}
		this.pushCurrentFocused();
		this.unfocus();
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

	preview() {
		this.plugin.coreSearchInterface?.preview(this.currentFocused);
	}

	open() {
		this.plugin.coreSearchInterface?.open(this.currentFocused);
	}
}
