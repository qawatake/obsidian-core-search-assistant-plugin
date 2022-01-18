import CoreSearchAssistantPlugin from 'main';
import { App, Scope } from 'obsidian';
import { OptionModal } from 'OptionModal';
import { validOutlineWidth } from 'Setting';
import { EVENT_SEARCH_RESULT_ITEM_DETECTED } from 'types/Shared';

const NUM_CARDS_PER_PAGE = 6;

export class Controller {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private scope: Scope | undefined;
	private currentPos: number | undefined;
	private stackedPositions: number[];
	private coverEl: HTMLElement;

	private countSearchItemDetected: number;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.stackedPositions = [];
		this.coverEl = this.createOutline();
		this.countSearchItemDetected = 0;
	}

	enter() {
		if (!this.scope) {
			this.scope = new Scope();
		}
		this.app.keymap.pushScope(this.scope);

		this.scope.register(['Ctrl'], 'N', (evt: KeyboardEvent) => {
			evt.preventDefault(); // ← necessary to stop cursor in search input
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

		if (this.plugin.settings?.autoPreviewMode === 'cardView') {
			this.plugin.coreSearchInterface?.startWatching();

			document.addEventListener(
				EVENT_SEARCH_RESULT_ITEM_DETECTED,
				this.callbackOnSearchResultItemDetected
			);

			this.plugin.cardView?.watchClickedCardItem();
		}

		this.showOutline();
	}

	reset() {
		this.forget();
		this.unfocus();
		this.plugin.cardView?.hide();
		this.countSearchItemDetected = 0;
	}

	exit() {
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = undefined;
		}
		this.pushCurrentPos();
		this.unfocus();
		this.plugin?.workspacePreview?.hide();
		// this.plugin.cardView?.close();
		this.countSearchItemDetected = 0;

		this.plugin.coreSearchInterface?.stopWatching();
		document.removeEventListener(
			EVENT_SEARCH_RESULT_ITEM_DETECTED,
			this.callbackOnSearchResultItemDetected
		);

		this.hideOutline();
	}

	forget() {
		this.currentPos = undefined;
		this.stackedPositions = [];
		this.countSearchItemDetected = 0;
	}

	recall() {
		this.popCurrentPos();
		this.showWorkspacePreview();
		this.renewCardViewPage();
		this.focus();
	}

	clean() {
		this.coverEl.remove();
		document.removeEventListener(
			EVENT_SEARCH_RESULT_ITEM_DETECTED,
			this.callbackOnSearchResultItemDetected
		);
	}

	renewCardViewPage() {
		this.plugin.cardView?.hide();
		const pageId = Math.floor((this.currentPos ?? 0) / NUM_CARDS_PER_PAGE);
		this.plugin.cardView?.renderPage(pageId, NUM_CARDS_PER_PAGE);
		this.plugin.cardView?.reveal();
	}

	showWorkspacePreview() {
		if (this.plugin.settings?.autoPreviewMode !== 'singleView') {
			return;
		}

		const item = this.plugin.coreSearchInterface?.getResultItemAt(
			this.currentPos ?? 0
		);
		if (!item) {
			return;
		}
		this.plugin?.workspacePreview?.renew(item.file);
	}

	private pushCurrentPos() {
		this.stackedPositions.push(this.currentPos ?? 0);
		this.currentPos = undefined;
	}

	private popCurrentPos() {
		this.currentPos = this.stackedPositions.pop() ?? undefined;
	}

	private navigateForward() {
		if (this.currentPos === undefined) {
			this.currentPos = 0;
		} else {
			const numResults = this.plugin.coreSearchInterface?.count() ?? 0;
			this.currentPos++;
			this.currentPos =
				this.currentPos < numResults ? this.currentPos : numResults - 1;

			if (this.currentPos % NUM_CARDS_PER_PAGE === 0) {
				this.renewCardViewPage();
			}
		}

		this.focus();
	}

	private navigateBack() {
		if (this.currentPos === undefined) {
			return;
		}
		this.currentPos--;
		this.currentPos = this.currentPos >= 0 ? this.currentPos : 0;

		if ((this.currentPos + 1) % NUM_CARDS_PER_PAGE === 0) {
			this.renewCardViewPage();
		}

		this.focus();
	}

	private focus() {
		if (this.currentPos === undefined) {
			return;
		}
		this.plugin.coreSearchInterface?.focusOn(this.currentPos);
		const pos = this.currentPos % NUM_CARDS_PER_PAGE;
		this.plugin.cardView?.focusOn(pos);
	}

	private unfocus() {
		this.plugin.coreSearchInterface?.unfocus();
		this.plugin.cardView?.unfocus();
	}

	private preview() {
		if (this.currentPos === undefined) {
			return;
		}
		this.plugin.coreSearchInterface?.preview(this.currentPos);
	}

	private open() {
		if (this.currentPos === undefined) {
			return;
		}
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
		_evt: Event
	) => {
		this.countSearchItemDetected++;
		if (this.countSearchItemDetected === NUM_CARDS_PER_PAGE) {
			this.renewCardViewPage();
		}
	};
}
