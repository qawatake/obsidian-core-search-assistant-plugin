import type { ModeScope } from "ModeScope";
import type CoreSearchAssistantPlugin from "main";
import {
	type App,
	MarkdownView,
	Modal,
	Notice,
	type SearchResultItem,
	type SplitDirection,
} from "obsidian";
import PreviewModalContent from "ui/PreviewModalContent.svelte";
import { generateInternalLinkFrom } from "utils/Link";
import { scrollIteration } from "utils/Util";

type ScrollDirection = "up" | "down";

const SCROLL_AMOUNT = 70;

export class PreviewModal extends Modal {
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly modeScope: ModeScope;
	private readonly item: SearchResultItem;

	currentFocus: number;
	private previewContent: PreviewModalContent | undefined;

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		modeScope: ModeScope,
		item: SearchResultItem,
	) {
		super(app);
		this.plugin = plugin;
		this.modeScope = modeScope;
		this.item = item;
		this.currentFocus = -1;
	}

	override async onOpen() {
		await this.renderView();

		this.modeScope.push();
		const hotkeyMap = this.plugin.settings?.previewModalHotkeys;
		if (!hotkeyMap) return;

		hotkeyMap.closeModal.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.shouldRestoreSelection = true;
				this.close();
			});
		});

		hotkeyMap.open.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.openAndFocus(this.currentFocus);
				this.plugin.controller?.exit();
				this.shouldRestoreSelection = false;
				this.close();
			});
		});

		hotkeyMap.openInNewPage.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.openAndFocus(
					this.currentFocus,
					this.plugin.settings?.splitDirection,
				);
				this.plugin.controller?.exit();
				this.shouldRestoreSelection = false;
				this.close();
			});
		});

		hotkeyMap.bigScrollDown.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll("down");
			});
		});

		hotkeyMap.bigScrollUp.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll("up");
			});
		});

		hotkeyMap.scrollDown.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll("down", SCROLL_AMOUNT);
			});
		});

		hotkeyMap.scrollUp.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				this.scroll("up", SCROLL_AMOUNT);
			});
		});

		hotkeyMap.focusNext.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault(); // to prevent inserting indent in editing mode in the active leaf
				const numMatches = this.countMatches();
				if (numMatches === undefined || numMatches === 0) {
					return;
				}
				this.currentFocus = cyclicId(++this.currentFocus, numMatches);
				this.previewContent?.focusOn(this.currentFocus, true);
			});
		});

		hotkeyMap.focusPrevious.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				evt.preventDefault();
				const numMatches = this.countMatches();
				if (numMatches === undefined || numMatches === 0) {
					return;
				}
				this.currentFocus = cyclicId(--this.currentFocus, numMatches);
				this.previewContent?.focusOn(this.currentFocus, true);
			});
		});

		hotkeyMap.togglePreviewMode.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, (evt) => {
				(async () => {
					evt.preventDefault();
					await this.previewContent?.toggleViewMode();
				})();
			});
		});

		hotkeyMap.copyLink.forEach((hotkey) => {
			this.scope.register(hotkey.modifiers, hotkey.key, () => {
				const { file } = this.item;
				const internalLink = generateInternalLinkFrom(this.app, file);
				navigator.clipboard.writeText(internalLink);
				new Notice("Copy wiki link!");
			});
		});
	}

	override onClose() {
		this.previewContent?.$destroy();

		// too fast to remain search mode
		setTimeout(() => {
			if (this.modeScope.depth > 1) {
				this.modeScope.pop();
			}
		}, 100);
	}

	private async renderView() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.hide();
		this.previewContent = new PreviewModalContent({
			target: contentEl,
			props: {
				file: this.item.file,
				matches: this.item.result.content,
			},
		});
		contentEl.show();
	}

	private countMatches(): number | undefined {
		return this.item.result.content?.length;
	}

	private scroll(direction: ScrollDirection, px?: number) {
		const { containerEl, contentEl } = this;
		const move =
			(px ?? containerEl.clientHeight / 2) * (direction === "up" ? -1 : 1);
		contentEl.scrollBy({
			top: move,
			behavior: "smooth",
		});
	}

	async openAndFocus(matchId: number, direction?: SplitDirection) {
		const { item } = this;

		// open file
		const leaf =
			direction === undefined
				? this.app.workspace.getMostRecentLeaf()
				: this.app.workspace.splitActiveLeaf(direction);
		await leaf.openFile(item.file);
		this.app.workspace.setActiveLeaf(leaf, true, true);

		// highlight matches
		const match = item?.result?.content?.[matchId];
		if (!match) {
			return;
		}
		const { view } = leaf;
		if (!(view instanceof MarkdownView)) {
			return;
		}
		const editor = view.editor;
		const range = {
			from: editor.offsetToPos(match[0]),
			to: editor.offsetToPos(match[1]),
		};
		editor.addHighlights([range], "obsidian-search-match-highlight");

		// scroll
		// if content of a file is too large, we need to call scrollIntoView many times
		const iter = scrollIteration(editor);
		if (iter === undefined) {
			return;
		}
		for (let i = 0; i < iter; i++) {
			editor.scrollIntoView(range, true);
		}
		editor.setCursor(range.from);
	}
}

function cyclicId(id: number, total: number): number {
	return ((id % total) + total) % total;
}
