import CoreSearchAssistantPlugin from 'main';
import { App, Scope } from 'obsidian';
import { OptionModal } from 'OptionModal';
import { validOutlineWidth } from 'Setting';
import { EVENT_SEARCH_RESULT_ITEM_DETECTED } from 'types/Shared';

export class Controller {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private scope: Scope | undefined;
	private currentPos = -1;
	private stackedPositions: number[];
	private coverEl: HTMLElement;

	private idToBeDisplayedNextInCardView: number;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.stackedPositions = [];
		this.coverEl = this.createOutline();
		this.idToBeDisplayedNextInCardView = 0;
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
		});
		this.scope.register(['Ctrl'], 'P', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateBack();
			this.showWorkspacePreview();
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

		this.plugin.coreSearchInterface?.startWatching();

		document.addEventListener(
			EVENT_SEARCH_RESULT_ITEM_DETECTED,
			this.callbackOnSearchResultItemDetected
		);

		this.showOutline();
	}

	reset() {
		this.forget();
		this.unfocus();
		this.plugin.cardView?.hide();
		this.idToBeDisplayedNextInCardView = 0;
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
		this.idToBeDisplayedNextInCardView = 0;

		this.plugin.coreSearchInterface?.stopWatching();
		document.removeEventListener(
			EVENT_SEARCH_RESULT_ITEM_DETECTED,
			this.callbackOnSearchResultItemDetected
		);

		this.hideOutline();
	}

	forget() {
		this.currentPos = -1;
		this.stackedPositions = [];
		this.idToBeDisplayedNextInCardView = 0;
	}

	recall() {
		this.popCurrentPos();
		this.showWorkspacePreview();
		this.focus();
	}

	clean() {
		this.coverEl.remove();
		document.removeEventListener(
			EVENT_SEARCH_RESULT_ITEM_DETECTED,
			this.callbackOnSearchResultItemDetected
		);
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

	private callbackOnSearchResultItemDetected: EventListener = (
		evt: Event
	) => {
		if (!(evt instanceof CustomEvent)) {
			return;
		}
		const item = this.plugin.coreSearchInterface?.getResultItemAt(
			this.idToBeDisplayedNextInCardView
		);
		if (!item) {
			return;
		}
		this.idToBeDisplayedNextInCardView++;
		this.plugin.cardView?.reveal();
		this.plugin.cardView?.renderItem(item);
	};
}
