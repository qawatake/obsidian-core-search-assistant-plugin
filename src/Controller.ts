import {
	CoreSearchAssistantEvents,
	EVENT_SEARCH_RESULT_ITEM_DETECTED,
} from 'Events';
import CoreSearchAssistantPlugin from 'main';
import { App, Component, Scope, SplitDirection } from 'obsidian';
import { OptionModal } from 'components/OptionModal';
import { parseCardLayout } from 'Setting';
import { PreviewModal } from 'components/PreviewModal';
import { Outline } from 'components/Outline';
import { WorkspacePreview } from 'components/WorkspacePreview';
import { CardView } from 'components/CardView';
import { ModeScope } from 'ModeScope';

const DELAY_TO_RELOAD_IN_MILLISECOND = 1000;

export class Controller extends Component {
	private readonly app: App;
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly events: CoreSearchAssistantEvents;
	private readonly modeScope: ModeScope;

	// children
	private readonly workspacePreview: WorkspacePreview;
	private readonly cardView: CardView;
	private readonly outline: Outline;

	// state variables
	private currentFocusId: number | undefined;
	private countSearchItemDetected: number;

	// closures
	private _detachHotkeys: (() => void) | undefined;
	private _layoutChanged: (() => boolean) | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.events = new CoreSearchAssistantEvents();
		this.modeScope = new ModeScope();

		// children
		this.workspacePreview = new WorkspacePreview(this.app, this.plugin);
		this.cardView = new CardView(this.app, this.plugin);
		this.outline = new Outline();

		// state variables
		this.countSearchItemDetected = 0;
	}

	override onunload() {
		this.exit();
	}

	override onload() {
		this.addChildren();
		this.saveLayout(); // use to check whether to renew controller
		this.setSearchModeTriggers();
	}

	enter() {
		this.setHotkeys();

		if (this.plugin.settings?.autoPreviewMode === 'cardView') {
			this.plugin.SearchComponentInterface?.startWatching(this.events);
		}

		if (this.plugin.settings === undefined) {
			throw '[ERROR in Core Search Assistant] failed to enter the search mode: failed to read setting';
		}
		this.outline.show(this.plugin.settings.outlineWidth);

		this.modeScope.push();
	}

	reset() {
		this.forget();
		this.unfocus();
		this.cardView.hide();
		this.countSearchItemDetected = 0;
	}

	exit() {
		this.detachHotkeys();
		this.unfocus();
		this.workspacePreview.hide();
		this.cardView.hide();
		this.countSearchItemDetected = 0;

		this.plugin.SearchComponentInterface?.stopWatching();

		this.outline?.hide();
		this.modeScope.reset();
	}

	focus() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.plugin.SearchComponentInterface?.focusOn(this.currentFocusId);
		const pos = this.positionInCardView(this.currentFocusId);
		if (pos === undefined) {
			return;
		}
		this.cardView.focusOn(pos);
	}

	open(direction?: SplitDirection) {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.plugin.SearchComponentInterface?.open(
			this.currentFocusId,
			direction
		);
	}

	renewCardViewPage() {
		if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
			return;
		}
		this.cardView.hide();
		this.cardView.renderPage(this.currentFocusId ?? 0);
		this.cardView.reveal();
	}

	private addChildren() {
		this.addChild(this.outline);
		this.addChild(this.workspacePreview);
		this.addChild(this.cardView);
	}

	private forget() {
		this.currentFocusId = undefined;
		this.countSearchItemDetected = 0;
	}

	private showCardViewItem(id: number) {
		const item = this.plugin.SearchComponentInterface?.getResultItemAt(id);
		if (!item) {
			return;
		}
		this.cardView.renderItem(item, id);
		this.cardView.setLayout();
		this.cardView.reveal();
	}

	private showWorkspacePreview() {
		if (this.plugin.settings?.autoPreviewMode !== 'singleView') {
			return;
		}

		const item = this.plugin.SearchComponentInterface?.getResultItemAt(
			this.currentFocusId ?? 0
		);
		if (!item) {
			return;
		}
		this.workspacePreview.renew(item);
	}

	private navigateForward() {
		if (this.currentFocusId === undefined) {
			this.currentFocusId = 0;
		} else {
			const numResults =
				this.plugin.SearchComponentInterface?.count() ?? 0;
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
		this.plugin.SearchComponentInterface?.unfocus();
		this.cardView.unfocus();
	}

	private openPreviewModal() {
		const { currentFocusId } = this;
		if (currentFocusId === undefined) {
			return;
		}
		const item =
			this.plugin.SearchComponentInterface?.getResultItemAt(
				currentFocusId
			);
		if (!item) {
			return;
		}
		new PreviewModal(this.app, this.plugin, this.modeScope, item).open();
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

	private retryCardView(delayMillisecond: number) {
		// i don't retry many times because it looks bad.
		setTimeout(() => {
			if (!this.cardView.itemsRenderedCorrectly()) {
				this.reset();
				this.renewCardViewPage();
			}
		}, delayMillisecond);
	}

	/**
	 * check layout change
	 * use for detecting whether layout-change really occurs
	 * @returns callback which returns
	 */
	private saveLayout() {
		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.plugin.SearchComponentInterface?.searchInputEl;
			this._layoutChanged = () =>
				inputEl !== this.plugin.SearchComponentInterface?.searchInputEl;
		});
	}

	get layoutChanged(): boolean {
		const required = this._layoutChanged?.();
		if (required === undefined) {
			throw '[ERROR in Core Search Assistant] failed to renewRequired: saveLayout was not called.';
		}
		return required;
	}

	private setSearchModeTriggers() {
		this.registerEvent(
			this.events.on(
				EVENT_SEARCH_RESULT_ITEM_DETECTED,
				this.onSearchResultItemDetected
			)
		);

		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.plugin.SearchComponentInterface?.searchInputEl;
			if (inputEl === undefined) {
				throw '[ERROR in Core Search Assistant] failed to find the search input form.';
			}

			this.registerDomEvent(document, 'click', () => {
				if (this.modeScope.depth > 1) {
					return;
				}

				this.exit();
			});
			this.registerDomEvent(inputEl, 'click', (evt) => {
				evt.stopPropagation();
				if (!this.modeScope.inSearchMode) {
					this.enter();
				}
			});

			// x "keydown" → capture Ctrl + Enter key
			// x "keypress" → do not recognize Backspace key
			this.registerDomEvent(inputEl, 'input', () => {
				if (!this.modeScope.inSearchMode) {
					this.enter();
				}
				this.reset();
			});
			// reload card view
			// Enter key is not recognized by input event
			this.registerDomEvent(inputEl, 'keypress', (evt) => {
				if (evt.key !== 'Enter') {
					return;
				}
				if (!this.modeScope.inSearchMode) {
					this.enter();
				}
				this.reset();
			});
			this.registerDomEvent(inputEl, 'focus', () => {
				if (!this.modeScope.inSearchMode) {
					this.enter();
				}
			});
		});
	}

	private setHotkeys() {
		const scope = new Scope();
		this.app.keymap.pushScope(scope);

		scope.register(['Ctrl'], 'N', (evt: KeyboardEvent) => {
			evt.preventDefault(); // ← necessary to stop cursor in search input
			this.navigateForward();
			this.showWorkspacePreview();
		});
		scope.register([], 'ArrowDown', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateForward();
			this.showWorkspacePreview();
		});
		scope.register(['Ctrl'], 'P', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateBack();
			this.showWorkspacePreview();
		});
		scope.register([], 'ArrowUp', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.navigateBack();
			this.showWorkspacePreview();
		});
		scope.register(['Ctrl'], 'Enter', (evt: KeyboardEvent) => {
			evt.preventDefault(); // ← necessary to prevent renew query, which triggers item detection events
			this.open();
			this.exit();
		});
		scope.register(['Ctrl', 'Shift'], 'Enter', (evt: KeyboardEvent) => {
			evt.preventDefault();
			this.open(this.plugin.settings?.splitDirection);
			this.exit();
		});
		scope.register(['Ctrl'], ' ', () => {
			if (this.app.vault.config.legacyEditor) {
				return;
			}
			this.openPreviewModal();
		});
		scope.register(['Shift'], ' ', () => {
			new OptionModal(this.app, this.plugin, this.modeScope).open();
		});
		scope.register([], 'Escape', () => {
			this.exit();
		});

		this._detachHotkeys = () => {
			this.app.keymap.popScope(scope);
		};
	}

	private detachHotkeys() {
		const detachHotkeys = this._detachHotkeys;
		if (detachHotkeys === undefined) {
			throw '[ERROR in Core Search Assistant] failed to detach hotkeys: setHotkeys was not called.';
		}
		detachHotkeys();
	}

	private get onSearchResultItemDetected(): () => void {
		return () => {
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

			if (this.countSearchItemDetected === 0) {
				this.cardView.hide();
			}

			this.showCardViewItem(this.countSearchItemDetected);

			if (this.countSearchItemDetected === 0) {
				this.retryCardView(DELAY_TO_RELOAD_IN_MILLISECOND);
			}
			this.countSearchItemDetected++;
		};
	}
}
