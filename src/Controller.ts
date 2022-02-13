import {
	CoreSearchAssistantEvents,
	EVENT_SEARCH_RESULT_ITEM_DETECTED,
	EVENT_SORT_ORDER_CHANGED,
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
import { SearchComponentInterface } from 'interfaces/SearchComponentInterface';
import { delay, retry } from 'utils/Util';

const DELAY_TO_RELOAD_IN_MILLISECOND = 1000;
const RETRY_INTERVAL = 1;
const RETRY_TRIALS = 1000;
const DELAY_TO_RENDER_CARD_VIEW_ON_ENTRY_IN_MILLISECOND = 100;

export class Controller extends Component {
	private readonly app: App;
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly searchInterface: SearchComponentInterface;
	private readonly events: CoreSearchAssistantEvents;
	private readonly modeScope: ModeScope;

	// children
	private workspacePreview: WorkspacePreview | undefined;
	private cardView: CardView | undefined;
	private outline: Outline | undefined;

	// state variables
	private currentFocusId: number | undefined;
	private countSearchItemDetected: number;

	// closures
	private _detachHotkeys: (() => void) | undefined;
	private _layoutChanged: (() => Promise<boolean>) | undefined;
	private _restoreOppositeSidedock: (() => void) | undefined;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		events: CoreSearchAssistantEvents,
		searchInterface: SearchComponentInterface
	) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.events = events;
		this.searchInterface = searchInterface;
		this.modeScope = new ModeScope();

		// state variables
		this.countSearchItemDetected = 0;
	}

	override onunload() {
		this.exit();
	}

	override onload() {
		this.saveLayout(); // use to check whether to renew controller
		this.setSearchModeTriggers();
	}

	async enter() {
		if (this.modeScope.inSearchMode) {
			return;
		}
		this.setHotkeys();
		this.addChildren();
		if (this.plugin.settings?.autoToggleSidebar) {
			this.collapseOppositeSidedock();
		}
		const shouldDetectSearchItems =
			this.plugin.settings?.autoPreviewMode === 'cardView' &&
			this.plugin.settings.renderCardsManually === false;
		if (shouldDetectSearchItems) {
			this.searchInterface.startWatching(this.events);
			// delay to render cards after expanding sidebar
			await delay(DELAY_TO_RENDER_CARD_VIEW_ON_ENTRY_IN_MILLISECOND);
			this.renewCardViewPage();
		}

		this.modeScope.push();
	}

	reset() {
		if (!this.modeScope.inSearchMode) {
			return;
		}
		this.forget();
		this.unfocus();
		this.cardView?.clear();
		this.countSearchItemDetected = 0;
	}

	exit(reason?: SearchModeExitReason) {
		if (!this.modeScope.inSearchMode) {
			return;
		}
		this.reset();
		this.detachHotkeys();
		this.removeChildren();

		if (this.shouldCollapseSidedock(reason)) {
			this.collapseSidedock();
		}
		if (this.plugin.settings?.autoToggleSidebar) {
			this.restoreOppositeSidedock();
		}

		this.countSearchItemDetected = 0;
		this.searchInterface.stopWatching();

		this.unfocus();
		this.modeScope.reset();
	}

	focus() {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.searchInterface.focusOn(this.currentFocusId);
		const pos = this.positionInCardView(this.currentFocusId);
		if (pos === undefined) {
			return;
		}
		this.cardView?.focusOn(pos);
	}

	open(direction?: SplitDirection) {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.searchInterface.open(this.currentFocusId, direction);
	}

	renewCardViewPage() {
		if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
			return;
		}
		this.cardView?.clear();
		this.cardView?.renderPage(this.currentFocusId ?? 0);
		this.cardView?.reveal();
	}

	private collapseSidedock() {
		this.plugin.searchInterface?.collapseSidedock();
	}

	private collapseOppositeSidedock() {
		const collapsed =
			this.plugin.searchInterface?.oppositeSidedock?.collapsed;
		this.plugin.searchInterface?.collapseOppositeSidedock();
		this._restoreOppositeSidedock = () => {
			if (collapsed === false) {
				this.plugin.searchInterface?.expandOppositeSidedock();
			}
		};
	}

	private restoreOppositeSidedock() {
		const restoreOppositeSidedock = this._restoreOppositeSidedock;
		if (restoreOppositeSidedock === undefined) {
			return undefined;
		}
		return restoreOppositeSidedock();
	}

	private addChildren() {
		this.removeChildren();

		if (this.plugin.settings === undefined) {
			throw '[ERROR in Core Search Assistant] failed to addChildren: failed to read setting';
		}
		this.outline = this.addChild(
			new Outline(this.plugin.settings.outlineWidth)
		);
		this.cardView = this.addChild(new CardView(this.app, this.plugin));
		this.workspacePreview = this.addChild(
			new WorkspacePreview(this.app, this.plugin)
		);
	}

	private removeChildren() {
		if (this.outline) {
			this.removeChild(this.outline);
		}
		if (this.cardView) {
			this.removeChild(this.cardView);
		}
		if (this.workspacePreview) {
			this.removeChild(this.workspacePreview);
		}
	}

	private forget() {
		this.currentFocusId = undefined;
		this.countSearchItemDetected = 0;
	}

	private showCardViewItem(id: number) {
		const item = this.searchInterface.getResultItemAt(id);
		if (!item) {
			return;
		}
		this.cardView?.renderItem(item, id);
		this.cardView?.setLayout();
		this.cardView?.reveal();
	}

	private showWorkspacePreview() {
		if (this.plugin.settings?.autoPreviewMode !== 'singleView') {
			return;
		}

		const item = this.searchInterface.getResultItemAt(
			this.currentFocusId ?? 0
		);
		if (!item) {
			return;
		}
		this.workspacePreview?.renew(item);
	}

	private navigateForward() {
		if (this.currentFocusId === undefined) {
			this.currentFocusId = 0;
		} else {
			const numResults = this.searchInterface.count() ?? 0;
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

	private moveToNextPage() {
		const pageId = this.pageId;
		if (pageId === undefined) return;
		const pageCount = this.pageCount;
		if (pageCount === undefined) return;
		if (pageId >= pageCount - 1) return;
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) return;
		this.currentFocusId = cardsPerPage * (pageId + 1);

		this.renewCardViewPage();
		this.focus();
	}

	private moveToPreviousPage() {
		const pageId = this.pageId;
		if (pageId === undefined) return;
		const pageCount = this.pageCount;
		if (pageCount === undefined) return;
		if (pageId <= 0) return;
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) return;
		this.currentFocusId = cardsPerPage * (pageId - 1);

		this.renewCardViewPage();
		this.focus();
	}

	private unfocus() {
		this.searchInterface.unfocus();
		this.cardView?.unfocus();
	}

	private openPreviewModal() {
		const { currentFocusId } = this;
		if (currentFocusId === undefined) {
			return;
		}
		const item = this.searchInterface.getResultItemAt(currentFocusId);
		if (!item) {
			return;
		}
		if (item.file.extension === 'md') {
			new PreviewModal(
				this.app,
				this.plugin,
				this.modeScope,
				item
			).open();
		}
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

	private get pageId(): number | undefined {
		if (this.currentFocusId === undefined) return undefined;
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) return undefined;
		const pageId = Math.floor(this.currentFocusId / cardsPerPage);
		return pageId;
	}

	private get pageCount(): number | undefined {
		const numResults = this.plugin.searchInterface?.count();
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) return undefined;
		const pageCount = Math.ceil((numResults ?? 0) / cardsPerPage);
		return pageCount;
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
			if (!this.cardView?.itemsRenderedCorrectly) {
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
		this.app.workspace.onLayoutReady(async () => {
			const inputEl = await retry(
				() => this.searchInterface.searchInputEl,
				RETRY_INTERVAL,
				RETRY_TRIALS
			);
			this._layoutChanged = async () =>
				inputEl !==
				(await retry(
					() => this.searchInterface.searchInputEl,
					RETRY_INTERVAL,
					RETRY_TRIALS
				));
		});
	}

	async layoutChanged(): Promise<boolean> {
		const required = await this._layoutChanged?.();
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

		this.registerEvent(
			this.events.on(EVENT_SORT_ORDER_CHANGED, this.onSortOrderChanged)
		);

		this.app.workspace.onLayoutReady(async () => {
			const appContainerEl = await retry(
				() => this.app.dom.appContainerEl,
				RETRY_INTERVAL,
				RETRY_TRIALS
			);
			if (appContainerEl === undefined) {
				throw '[ERROR in Core Search Assistant] failed to find the app container element';
			}

			const inputEl = await retry(
				() => this.plugin.searchInterface?.searchInputEl,
				RETRY_INTERVAL,
				RETRY_TRIALS
			);
			if (inputEl === undefined) {
				throw '[ERROR in Core Search Assistant] failed to find the search input form.';
			}

			// card view should refresh
			const matchingCaseButtonEl = await retry(
				() => this.plugin.searchInterface?.matchingCaseButtonEl,
				RETRY_INTERVAL,
				RETRY_TRIALS
			);
			if (matchingCaseButtonEl === undefined) {
				throw '[ERROR in Core Search Assistant] failed to find the matching case button.';
			}

			// by using appContainerEl instead of document, can ignore menu element appearing when changeSortOrderEl clicked
			this.registerDomEvent(appContainerEl, 'click', (evt) => {
				const targetEl = evt.target;
				if (!(targetEl instanceof HTMLElement)) {
					return;
				}
				// search panel
				if (
					this.plugin.searchInterface?.searchLeaf?.containerEl.contains(
						targetEl
					)
				) {
					if (
						!this.plugin.searchInterface.isBuiltInElementToOpenFile(
							targetEl
						)
					)
						return;
				}
				// search tab header
				if (
					this.plugin.searchInterface?.tabHeaderEl?.contains(targetEl)
				) {
					return;
				}
				// buttons to show more context
				// this button element has no parent, so we must check it directly
				if (
					this.plugin.searchInterface?.isShowMoreContextButton(
						targetEl
					)
				) {
					return;
				}
				if (this.modeScope.depth === 1) {
					this.exit({ id: 'mouse', event: evt });
				}
			});
			this.registerDomEvent(matchingCaseButtonEl, 'click', () => {
				if (this.modeScope.inSearchMode) {
					this.reset();
				}
			});
			this.registerDomEvent(inputEl, 'click', () => {
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
		scope.register(['Ctrl'], ']', () => {
			if (this.plugin.settings?.autoPreviewMode === 'cardView') {
				this.moveToNextPage();
			}
		});
		scope.register(['Ctrl'], '[', () => {
			if (this.plugin.settings?.autoPreviewMode === 'cardView') {
				this.moveToPreviousPage();
			}
		});
		scope.register([], 'Escape', () => {
			this.exit();
		});
		scope.register([], 'Enter', (evt) => {
			const shouldRenderCardsManually =
				this.plugin.settings?.autoPreviewMode === 'cardView' &&
				this.plugin.settings.renderCardsManually;
			if (shouldRenderCardsManually) {
				evt.preventDefault(); // prevent submit to stop renewing search results
				this.reset();
				this.renewCardViewPage();
			}
		});

		this._detachHotkeys = () => {
			this.app.keymap.popScope(scope);
		};
	}

	private detachHotkeys() {
		const detachHotkeys = this._detachHotkeys;
		if (detachHotkeys === undefined) {
			return;
		}
		detachHotkeys();
	}

	private get onSearchResultItemDetected(): () => void {
		return () => {
			if (this.plugin.settings?.autoPreviewMode !== 'cardView') {
				return;
			}
			// ↓ is necessary because items are detected at an unexpected timing.
			if (this.currentFocusId !== undefined) {
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
				this.cardView?.clear();
			}
			this.showCardViewItem(this.countSearchItemDetected);

			if (this.countSearchItemDetected === 0) {
				this.retryCardView(DELAY_TO_RELOAD_IN_MILLISECOND);
			}
			this.countSearchItemDetected++;
		};
	}

	private get onSortOrderChanged(): () => void {
		return () => {
			this.reset();
			if (this.plugin.settings?.autoPreviewMode === 'cardView') {
				this.renewCardViewPage();
			}
		};
	}

	private shouldCollapseSidedock(reason?: SearchModeExitReason): boolean {
		if (!this.plugin.settings?.autoToggleSidebar) {
			return false;
		}
		if (reason === undefined) {
			return true;
		}
		if (reason.id !== 'mouse') {
			return true;
		}
		const targetEl = reason.event.target;
		if (!(targetEl instanceof HTMLElement)) {
			return true;
		}
		return !this.searchInterface.sideDock?.containerEl.contains(targetEl);
	}
}

type SearchModeExitReason =
	| SearchModeExitByMouse
	| SearchModeExitByKeyboard
	| SearchModeExitOnOpeningFile
	| SearchModeExitUnknownReason;

interface SearchModeExitByMouse {
	id: 'mouse';
	event: MouseEvent;
}

interface SearchModeExitByKeyboard {
	id: 'keyboard';
	event: KeyboardEvent;
}

interface SearchModeExitOnOpeningFile {
	id: 'file';
}

interface SearchModeExitUnknownReason {
	id: 'unknown';
}
