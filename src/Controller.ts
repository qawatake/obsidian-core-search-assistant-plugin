import {
	CoreSearchAssistantEvents,
	EVENT_SEARCH_RESULT_ITEM_DETECTED,
	EVENT_SORT_ORDER_CHANGED,
} from 'Events';
import type CoreSearchAssistantPlugin from 'main';
import * as obsidian from 'obsidian';
import { OptionModal } from 'components/OptionModal';
import { parseCardLayout } from 'Setting';
import { PreviewModal } from 'components/PreviewModal';
import { Outline } from 'components/Outline';
import { WorkspacePreview } from 'components/WorkspacePreview';
import { ModeScope } from 'ModeScope';
import type { SearchComponentInterface } from 'interfaces/SearchComponentInterface';
import { delay, retry } from 'utils/Util';
import { debounce, Notice, TFile } from 'obsidian';
import { generateInternalLinkFrom } from 'utils/Link';
import CardViewComponent from 'ui/CardViewComponent.svelte';

const DELAY_TO_RELOAD_IN_MILLISECOND = 1000;
const RETRY_INTERVAL = 1;
const RETRY_TRIALS = 1000;
const DELAY_TO_RENDER_CARD_VIEW_ON_ENTRY_IN_MILLISECOND = 100;

export class Controller extends obsidian.Component {
	private readonly app: obsidian.App;
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly searchInterface: SearchComponentInterface;
	private readonly events: CoreSearchAssistantEvents;
	private readonly modeScope: ModeScope;

	// children
	private workspacePreview: WorkspacePreview | undefined;
	private outline: Outline | undefined;
	private component: CardViewComponent | undefined;
	private addedCard: number;
	private cardViewCheckDebouncer: any;

	// state variables
	private currentFocusId: number | undefined;
	private countSearchItemDetected: number;

	// closures
	private _detachHotkeys: (() => void) | undefined;
	private _layoutChanged: (() => Promise<boolean>) | undefined;
	private _restoreOppositeSidedock: (() => void) | undefined;

	constructor(
		app: obsidian.App,
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
		this.cardViewCheckDebouncer = debounce(
			this.onCheckCardView,
			DELAY_TO_RELOAD_IN_MILLISECOND,
			true
		);

		// state variables
		this.countSearchItemDetected = 0;

		this.addedCard = 0;
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
		this.component?.detachCards();
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
		this.component?.focusOn(this.currentFocusId);
	}

	open(direction?: obsidian.SplitDirection) {
		if (this.currentFocusId === undefined) {
			return;
		}
		this.searchInterface.open(this.currentFocusId, direction);
	}

	async renewCardViewPage() {
		if (this.plugin.settings?.autoPreviewMode !== 'cardView') return;

		this.component?.detachCards();
		this.component?.renderPage(this.filesToBeRendered());
		if (this.currentFocusId !== undefined) {
			this.component?.focusOn(this.currentFocusId ?? 0);
		}
	}

	private filesToBeRendered(): TFile[] {
		const cardsPerPage = this.cardsPerPage();
		if (cardsPerPage === undefined) {
			return [];
		}
		const pageId = Math.floor((this.currentFocusId ?? 0) / cardsPerPage);

		const items = this.plugin.searchInterface?.resultItems;
		if (!items) return [];
		return items.slice(pageId * cardsPerPage).map((item) => item.file);
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
		if (this.plugin.settings.autoPreviewMode === 'cardView') {
			this.renewCardViewComponent();
		}
		this.workspacePreview = this.addChild(
			new WorkspacePreview(this.app, this.plugin)
		);
	}

	private removeChildren() {
		if (this.outline) {
			this.removeChild(this.outline);
		}
		this.component?.$destroy();
		this.component = undefined;
		if (this.workspacePreview) {
			this.removeChild(this.workspacePreview);
		}
	}

	private forget() {
		this.currentFocusId = undefined;
		this.countSearchItemDetected = 0;
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
		const shouldRenewController = await this._layoutChanged?.();
		if (shouldRenewController === undefined) {
			throw '[ERROR in Core Search Assistant] failed to renewRequired: saveLayout was not called.';
		}
		return shouldRenewController;
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
		const hotkeyMap = this.plugin.settings?.searchModeHotkeys;
		if (!hotkeyMap) return;

		const scope = new obsidian.Scope();
		this.app.keymap.pushScope(scope);

		hotkeyMap.selectNext.forEach((hotkey) => {
			scope.register(
				hotkey.modifiers,
				hotkey.key,
				(evt: KeyboardEvent) => {
					evt.preventDefault(); // ← necessary to stop cursor in search input
					this.navigateForward();
					this.showWorkspacePreview();
				}
			);
		});
		hotkeyMap.selectPrevious.forEach((hotkey) => {
			scope.register(
				hotkey.modifiers,
				hotkey.key,
				(evt: KeyboardEvent) => {
					evt.preventDefault();
					this.navigateBack();
					this.showWorkspacePreview();
				}
			);
		});
		hotkeyMap.open.forEach((hotkey) => {
			scope.register(
				hotkey.modifiers,
				hotkey.key,
				(evt: KeyboardEvent) => {
					evt.preventDefault(); // ← necessary to prevent renew query, which triggers item detection events
					this.open();
					this.exit();
				}
			);
		});
		hotkeyMap.openInNewPane.forEach((hotkey) => {
			scope.register(
				hotkey.modifiers,
				hotkey.key,
				(evt: KeyboardEvent) => {
					evt.preventDefault();
					this.open(this.plugin.settings?.splitDirection);
					this.exit();
				}
			);
		});
		hotkeyMap.previewModal.forEach((hotkey) => {
			scope.register(hotkey.modifiers, hotkey.key, () => {
				if (this.app.vault.config.legacyEditor) {
					return;
				}
				this.openPreviewModal();
			});
		});
		hotkeyMap.showOptions.forEach((hotkey) => {
			scope.register(hotkey.modifiers, hotkey.key, () => {
				new OptionModal(this.app, this.plugin, this.modeScope).open();
			});
		});
		hotkeyMap.nextPage.forEach((hotkey) => {
			scope.register(hotkey.modifiers, hotkey.key, () => {
				if (this.plugin.settings?.autoPreviewMode === 'cardView') {
					this.moveToNextPage();
				}
			});
		});
		hotkeyMap.previousPage.forEach((hotkey) => {
			scope.register(hotkey.modifiers, hotkey.key, () => {
				if (this.plugin.settings?.autoPreviewMode === 'cardView') {
					this.moveToPreviousPage();
				}
			});
		});
		hotkeyMap.copyLink.forEach((hotkey) => {
			scope.register(hotkey.modifiers, hotkey.key, () => {
				const item = this.searchInterface.getResultItemAt(
					this.currentFocusId ?? 0
				);
				if (!item) return;
				const { file } = item;
				const internalLink = generateInternalLinkFrom(
					this.app.metadataCache,
					file
				);
				navigator.clipboard.writeText(internalLink);
				new Notice('Copy wiki link!');
			});
		});
		scope.register([], 'Escape', () => {
			this.exit();
		});

		scope.register([], 'Enter', (evt) => {
			setTimeout(this.focusOnInput, 100); // neccesary because otherwise focus + enter triggers submit events

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

			if (this.countSearchItemDetected === 0) {
				this.component?.detachCards();
			}

			const item = this.searchInterface.getResultItemAt(
				this.countSearchItemDetected
			);
			if (!item) return;
			this.component?.addCard(item.file);
			this.cardViewCheckDebouncer();
			this.countSearchItemDetected++;
		};
	}

	private renewCardViewComponent() {
		this.component?.$destroy();
		const { settings } = this.plugin;
		if (!settings) return;
		const focusEl = this.searchInterface.searchInputEl;
		if (!focusEl) return;
		this.app.workspace.onLayoutReady(() => {
			const containerEl = this.app.workspace.rootSplit.containerEl;
			const component = new CardViewComponent({
				target: containerEl,
				props: {
					layout: settings.cardViewLayout,
					focusEl: focusEl,
				},
			});
			this.component = component;
		});
	}

	private get focusOnInput(): () => Promise<void> {
		return async () => {
			const inputEl = await retry(
				() => this.plugin.searchInterface?.searchInputEl,
				RETRY_INTERVAL,
				RETRY_TRIALS
			);
			if (inputEl === undefined) {
				throw '[ERROR in Core Search Assistant] failed to find the search input form.';
			}
			inputEl.focus();
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

	private get onCheckCardView(): () => any {
		return () => {
			const { component } = this;
			if (!component) return;
			const ok = component.checkCardsRenderedCorrectly(
				this.filesToBeRendered()
			);
			if (!ok) {
				this.reset();
				this.renewCardViewPage();
			}
		};
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
