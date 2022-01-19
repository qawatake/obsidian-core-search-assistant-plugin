import {
	CoreSearchAssistantEvents,
	EVENT_SEARCH_RESULT_ITEM_DETECTED,
} from 'Events';
import CoreSearchAssistantPlugin from 'main';
import { App, Component, Scope } from 'obsidian';
import { OptionModal } from 'OptionModal';
import { parseCardLayout, validOutlineWidth } from 'Setting';

export class Controller extends Component {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private scope: Scope | undefined;
	private events: CoreSearchAssistantEvents;
	private currentFocusId: number | undefined;
	private outlineEl: HTMLElement;
	private _inSearchMode: boolean;
	private countSearchItemDetected: number;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.events = new CoreSearchAssistantEvents();
		this.outlineEl = this.createOutline();
		this._inSearchMode = false;
		this.countSearchItemDetected = 0;
	}

	override onunload() {
		this.outlineEl.empty();
		this.outlineEl.remove();
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = undefined;
		}
	}

	override onload() {
		this.registerEvent(
			this.events.on(EVENT_SEARCH_RESULT_ITEM_DETECTED, () => {
				if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
					return;
				}

				const cardsPerPage = this.cardsPerPage();
				if (cardsPerPage === undefined) {
					return;
				}
				if (this.countSearchItemDetected >= cardsPerPage) {
					return;
				}
				this.showCardViewItem(this.countSearchItemDetected);
				this.countSearchItemDetected++;
			})
		);

		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.plugin.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}

			this.registerDomEvent(document, 'click', () => {
				this.exit();
			});
			this.registerDomEvent(inputEl, 'click', (evt) => {
				evt.stopPropagation();
				if (!this.inSearchMode()) {
					this.enter();
				}
			});

			// x "keydown" → capture Ctrl + Enter key
			// x "keypress" → do not recognize Backspace key
			this.registerDomEvent(inputEl, 'input', () => {
				if (!this.inSearchMode()) {
					this.enter();
				}
				this.reset();
			});
			this.registerDomEvent(inputEl, 'focus', () => {
				if (!this.inSearchMode()) {
					this.enter();
				}
			});
		});
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
		this.scope.register(['Ctrl'], 'Enter', (evt: KeyboardEvent) => {
			evt.preventDefault(); // ← necessary to prevent renew query, which triggers item detection events
			this.open();
		});
		this.scope.register(['Ctrl'], ' ', () => {
			this.preview();
		});
		this.scope.register(['Shift'], ' ', () => {
			new OptionModal(this.app, this.plugin).open();
		});
		this.scope.register([], 'Escape', () => {
			this.exit();
		});

		if (this.plugin.settings?.autoPreviewMode === 'cardView') {
			this.plugin.coreSearchInterface?.startWatching(this.events);
		}

		this.showOutline();
		this.setInSearchMode(true);
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
		this.unfocus();
		this.plugin?.workspacePreview?.hide();
		this.plugin.cardView?.hide();
		this.countSearchItemDetected = 0;

		this.plugin.coreSearchInterface?.stopWatching();

		this.outlineEl.hide();
		this.setInSearchMode(false);
	}

	focus() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.plugin.coreSearchInterface?.focusOn(this.currentFocusId);
		const pos = this.positionInCardView(this.currentFocusId);
		if (pos === undefined) {
			return;
		}
		this.plugin.cardView?.focusOn(pos);
	}

	inSearchMode(): boolean {
		return this._inSearchMode;
	}

	private forget() {
		this.currentFocusId = undefined;
		this.countSearchItemDetected = 0;
	}

	private renewCardViewPage() {
		if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
			return;
		}
		this.plugin.cardView?.hide();
		this.plugin.cardView?.renderPage(this.currentFocusId ?? 0);
		this.plugin.cardView?.reveal();
	}

	private showCardViewItem(id: number) {
		const item = this.plugin.coreSearchInterface?.getResultItemAt(id);
		if (!item) {
			return;
		}
		this.plugin.cardView?.renderItem(item, id);
		this.plugin.cardView?.setLayout();
		this.plugin.cardView?.reveal();
	}

	private showWorkspacePreview() {
		if (this.plugin.settings?.autoPreviewMode !== 'singleView') {
			return;
		}

		const item = this.plugin.coreSearchInterface?.getResultItemAt(
			this.currentFocusId ?? 0
		);
		if (!item) {
			return;
		}
		this.plugin?.workspacePreview?.renew(item.file);
	}

	private navigateForward() {
		if (this.currentFocusId === undefined) {
			this.currentFocusId = 0;
		} else {
			const numResults = this.plugin.coreSearchInterface?.count() ?? 0;
			this.currentFocusId++;
			this.currentFocusId =
				this.currentFocusId < numResults
					? this.currentFocusId
					: numResults - 1;

			if (this.shouldTransitNextPageInCardView()) {
				this.renewCardViewPage();
			}
		}

		this.focus();
	}

	private navigateBack() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.currentFocusId--;
		this.currentFocusId =
			this.currentFocusId >= 0 ? this.currentFocusId : 0;

		if (this.shouldTransitPreviousPageInCardView()) {
			this.renewCardViewPage();
		}

		this.focus();
	}

	private unfocus() {
		this.plugin.coreSearchInterface?.unfocus();
		this.plugin.cardView?.unfocus();
	}

	private preview() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.plugin.coreSearchInterface?.preview(this.currentFocusId);
	}

	private open() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.plugin.coreSearchInterface?.open(this.currentFocusId);
	}

	private createOutline(): HTMLElement {
		const outlineEl = document.body.createEl('div', {
			cls: 'core-search-assistant_search-mode-outline',
		});
		outlineEl.hide();
		return outlineEl;
	}

	private showOutline() {
		const outlineWidth = validOutlineWidth(
			this.plugin.settings?.outlineWidth
		);
		this.outlineEl.style.outline = `${outlineWidth}px solid var(--interactive-accent)`;
		this.outlineEl.style.outlineOffset = `-${outlineWidth}px`;
		this.outlineEl.show();
	}

	private shouldTransitNextPageInCardView(): boolean {
		if (!this.plugin.settings) {
			return false;
		}
		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		const cardsPerPage = row * column;
		if (this.currentFocusId === undefined) {
			return false;
		}
		return this.currentFocusId % cardsPerPage === 0;
	}

	private shouldTransitPreviousPageInCardView(): boolean {
		if (!this.plugin.settings) {
			return false;
		}
		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		const cardsPerPage = row * column;

		if (this.currentFocusId === undefined) {
			return false;
		}
		return (this.currentFocusId + 1) % cardsPerPage === 0;
	}

	private positionInCardView(id: number | undefined): number | undefined {
		if (id === undefined) {
			return undefined;
		}
		const cardsPerPage = this.cardsPerPage();
		if (!cardsPerPage) {
			return undefined;
		}
		return id % cardsPerPage;
	}

	private cardsPerPage(): number | undefined {
		if (!this.plugin.settings) {
			return undefined;
		}

		const [row, column] = parseCardLayout(
			this.plugin.settings.cardViewLayout
		);
		return row * column;
	}

	private setInSearchMode(on: boolean) {
		this._inSearchMode = on;
	}
}
