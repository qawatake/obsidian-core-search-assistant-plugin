import MyPlugin from 'main';
import { App, Scope } from 'obsidian';
import { OptionModal } from 'OptionModal';

export class Controller {
	private app: App;
	private plugin: MyPlugin;
	private scope: Scope | undefined;
	private currentPos = -1;
	private stackedPositions: number[];

	constructor(app: App, plugin: MyPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.stackedPositions = [];
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
		this.pushCurrentPos();
		this.unfocus();
	}

	forget() {
		this.currentPos = -1;
		this.stackedPositions = [];
	}

	recall() {
		this.popCurrentPos();
		this.focus();
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
}
