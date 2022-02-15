import type CoreSearchAssistantPlugin from 'main';
import {
	App,
	type Hotkey,
	PluginSettingTab,
	Setting,
	type SplitDirection,
	Scope,
	type Modifier,
	Keymap,
	Notice,
} from 'obsidian';
import type { SvelteComponent } from 'svelte';
import HotkeySetting from 'ui/HotkeySetting.svelte';
import HotkeyEntry from 'ui/HotkeyEntry.svelte';
import { HotkeySetter } from 'ui/HotkeySetter';
import { contain } from 'utils/Keymap';

const AVAILABLE_OUTLINE_WIDTHS = [0, 3, 5, 7, 10] as const;
export type AvailableOutlineWidth = typeof AVAILABLE_OUTLINE_WIDTHS[number];

const AUTO_PREVIEW_MODE_IDS = ['none', 'singleView', 'cardView'] as const;
type AutoPreviewMode = typeof AUTO_PREVIEW_MODE_IDS[number];
const autoPreviewModeInfos: Record<AutoPreviewMode, string> = {
	none: 'none',
	singleView: 'single view',
	cardView: 'card view',
};

const AVAILABLE_CARD_LAYOUT = ['2x2', '2x3', '3x2', '3x3'] as const;
type AvailableCardLayout = typeof AVAILABLE_CARD_LAYOUT[number];

type HotkeyMap = {
	[actionId: string]: Hotkey[];
};

export interface CoreSearchAssistantPluginSettings {
	keepSelectedItemsCentered: boolean;
	outlineWidth: AvailableOutlineWidth;
	autoPreviewMode: AutoPreviewMode;
	cardViewLayout: AvailableCardLayout;
	splitDirection: SplitDirection;
	autoToggleSidebar: boolean;
	renderCardsManually: boolean;
	hideIframe: boolean;
	searchModeHotkeys: HotkeyMap;
	previewModalHotkeys: HotkeyMap;
}

export const DEFAULT_SETTINGS: CoreSearchAssistantPluginSettings = {
	keepSelectedItemsCentered: false,
	outlineWidth: 5,
	autoPreviewMode: 'cardView',
	cardViewLayout: '2x3',
	splitDirection: 'horizontal',
	autoToggleSidebar: false,
	renderCardsManually: false,
	hideIframe: false,
	searchModeHotkeys: {
		selectNext: [
			{ modifiers: ['Ctrl'], key: 'n' },
			{ modifiers: [], key: 'ArrowDown' },
		],
		selectPrevious: [
			{ modifiers: ['Ctrl'], key: 'p' },
			{ modifiers: [], key: 'ArrowUp' },
		],
		previewModal: [{ modifiers: ['Ctrl'], key: ' ' }],
		open: [{ modifiers: ['Ctrl'], key: 'Enter' }],
		openInNewPane: [{ modifiers: ['Ctrl', 'Shift'], key: 'Enter' }],
		showOptions: [{ modifiers: ['Shift'], key: ' ' }],
		nextPage: [{ modifiers: ['Ctrl'], key: ']' }],
		previousPage: [{ modifiers: ['Ctrl'], key: '[' }],
	},
	previewModalHotkeys: {
		scrollDown: [
			{ modifiers: ['Ctrl'], key: 'n' },
			{ modifiers: [], key: 'ArrowDown' },
		],
		scrollUp: [
			{ modifiers: ['Ctrl'], key: 'p' },
			{ modifiers: [], key: 'ArrowUp' },
		],
		bigScrollDown: [{ modifiers: [], key: ' ' }],
		bigScrollUp: [{ modifiers: ['Shift'], key: ' ' }],
		open: [{ modifiers: ['Ctrl'], key: 'Enter' }],
		openInNewPage: [{ modifiers: ['Ctrl', 'Shift'], key: 'Enter' }],
		focusNext: [{ modifiers: [], key: 'Tab' }],
		focusPrevious: [{ modifiers: ['Shift'], key: 'Tab' }],
	},
};

export class CoreSearchAssistantSettingTab extends PluginSettingTab {
	plugin: CoreSearchAssistantPlugin;
	hotkeySetters: HotkeySetter[];

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.hotkeySetters = [];
	}

	display(): void {
		this.hide();
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Keep selected item centered')
			.addToggle((component) => {
				component
					.setValue(
						this.plugin.settings?.keepSelectedItemsCentered ??
							DEFAULT_SETTINGS.keepSelectedItemsCentered
					)
					.onChange((value) => {
						if (!this.plugin.settings) {
							return;
						}
						this.plugin.settings.keepSelectedItemsCentered = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Outline width (px)')
			.setDesc('An outline appears when you enter search mode.')
			.addDropdown((component) => {
				AVAILABLE_OUTLINE_WIDTHS.forEach((width) => {
					const text = width.toString();
					component.addOption(text, text);
				});

				component
					.setValue(
						validOutlineWidth(
							this.plugin.settings?.outlineWidth
						).toString()
					)
					.onChange((value) => {
						const width = Number.parseInt(value);
						if (!this.plugin.settings) {
							return;
						}
						if (!AVAILABLE_OUTLINE_WIDTHS.includes(width as any)) {
							return;
						}
						this.plugin.settings.outlineWidth =
							width as AvailableOutlineWidth;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Auto preview mode')
			.addDropdown((component) => {
				component
					.addOptions(autoPreviewModeInfos)
					.setValue(
						this.plugin.settings?.autoPreviewMode ?? 'cardView'
					)
					.onChange((id) => {
						if (!this.plugin.settings) {
							return;
						}
						if (
							!AUTO_PREVIEW_MODE_IDS.includes(
								id as AutoPreviewMode
							)
						) {
							return;
						}
						this.plugin.settings.autoPreviewMode =
							id as AutoPreviewMode;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default layout of card view')
			.addDropdown((component) => {
				AVAILABLE_CARD_LAYOUT.forEach((layout) => {
					component.addOption(layout, layout);
				});

				component
					.setValue(
						this.plugin.settings?.cardViewLayout ??
							DEFAULT_SETTINGS.cardViewLayout
					)
					.onChange((value) => {
						if (!this.plugin.settings) {
							return;
						}
						if (
							!AVAILABLE_CARD_LAYOUT.includes(
								value as AvailableCardLayout
							)
						) {
							return;
						}
						this.plugin.settings.cardViewLayout =
							value as AvailableCardLayout;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Default split direction')
			.setDesc('This applies when you open a file in a new pane')
			.addDropdown((component) => {
				if (!this.plugin.settings) {
					return;
				}
				component
					.addOptions({
						horizontal: 'horizontal',
						vertical: 'vertical',
					})
					.setValue(this.plugin.settings.splitDirection) // it should be after addOptions
					.onChange(async (direction) => {
						if (!this.plugin.settings) {
							return;
						}
						if (
							direction == 'horizontal' ||
							direction == 'vertical'
						) {
							this.plugin.settings.splitDirection = direction;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName('Toggle sidebars automatically')
			.setDesc(
				'Automatically collapse the other sidebar when entering the search mode and the search panel when exiting the search mode'
			)
			.addToggle((component) => {
				if (!this.plugin.settings) {
					return;
				}
				component
					.setValue(this.plugin.settings.autoToggleSidebar)
					.onChange((value) => {
						if (!this.plugin.settings) {
							return;
						}
						this.plugin.settings.autoToggleSidebar = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Render cards manually')
			.setDesc('If enabled, you must hit the enter key to render cards.')
			.addToggle((component) => {
				if (!this.plugin.settings) return;
				component
					.setValue(this.plugin.settings.renderCardsManually)
					.onChange((value) => {
						if (!this.plugin.settings) return;
						this.plugin.settings.renderCardsManually = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Hide iframe from auto preview')
			.setDesc('Some iframe elements prevent the keyboard operation.')
			.addToggle((component) => {
				if (!this.plugin.settings) {
					return;
				}
				component
					.setValue(this.plugin.settings.hideIframe)
					.onChange((value) => {
						if (!this.plugin.settings) {
							return;
						}
						this.plugin.settings.hideIframe = value;
						this.plugin.saveSettings();
					});
			});

		containerEl.createEl('h2', { text: 'Hotkeys' });
		const { settings } = this.plugin;
		containerEl.createEl('h3', { text: 'Search mode' });
		if (!settings) return;
		Object.keys(settings.searchModeHotkeys).forEach((actionId) => {
			const hotkeys = settings.searchModeHotkeys[actionId];
			const defaultHotkeys = DEFAULT_SETTINGS.searchModeHotkeys[actionId];
			if (!hotkeys) return;
			if (!defaultHotkeys) return;
			const hotkeySetter = new HotkeySetter(
				this.app,
				containerEl,
				actionId,
				hotkeys,
				defaultHotkeys
			).onChanged((renewed, added) => {
				if (added) {
					// modifier key should be pressed
					if (added.modifiers.length === 0) return false;

					// avoid collision
					const collision = Object.values(
						settings.searchModeHotkeys
					).some((hotkeys) => {
						return contain(hotkeys, added);
					});
					if (collision) {
						new Notice('Hotkeys are conflicting!');
						return false;
					}
				}
				settings.searchModeHotkeys[actionId] = renewed;
				this.plugin.saveSettings();
				return true;
			});
			this.hotkeySetters.push(hotkeySetter);
		});

		containerEl.createEl('h3', { text: 'Preview Modal' });
		Object.keys(settings.previewModalHotkeys).forEach((actionId) => {
			const hotkeys = settings.previewModalHotkeys[actionId];
			const defaultHotkeys =
				DEFAULT_SETTINGS.previewModalHotkeys[actionId];
			if (!hotkeys) return;
			if (!defaultHotkeys) return;
			const hotkeySetter = new HotkeySetter(
				this.app,
				containerEl,
				actionId,
				hotkeys,
				defaultHotkeys
			).onChanged((renewed, added) => {
				if (added) {
					// modifier key should be pressed
					if (added.modifiers.length === 0) return false;

					// avoid collision
					const collision = Object.values(
						settings.previewModalHotkeys
					).some((hotkeys) => {
						return contain(hotkeys, added);
					});
					if (collision) {
						new Notice('Hotkeys are conflicting!');
						return false;
					}
				}
				settings.previewModalHotkeys[actionId] = renewed;
				this.plugin.saveSettings();
				return true;
			});
			this.hotkeySetters.push(hotkeySetter);
		});
	}

	override hide() {
		super.hide();
		this.hotkeySetters.forEach((s) => s.unload());
		this.hotkeySetters = [];
		console.log('hide');
	}
}

export function validOutlineWidth(width: unknown): AvailableOutlineWidth {
	if (typeof width !== 'number') {
		return DEFAULT_SETTINGS.outlineWidth;
	}
	if (!Number.isInteger(width)) {
		return DEFAULT_SETTINGS.outlineWidth;
	}
	if (!AVAILABLE_OUTLINE_WIDTHS.includes(width as any)) {
		return DEFAULT_SETTINGS.outlineWidth;
	}
	return width as AvailableOutlineWidth;
}

export function parseCardLayout(layout: AvailableCardLayout): [number, number] {
	const [row, column] = layout.split('x');
	return [Number.parseInt(row ?? '0'), Number.parseInt(column ?? '0')];
}

interface SearchModeHotkeys {
	selectNext: Hotkey[];
	selectPrevious: Hotkey[];
	previewModal: Hotkey[];
	open: Hotkey[];
	openInNewPane: Hotkey[];
	showOptions: Hotkey[];
	nextPage: Hotkey[];
	previousPage: Hotkey[];
}

interface PreviewModalHotkeys {
	scrollDown: Hotkey[];
	scrollUp: Hotkey[];
	bigScrollDown: Hotkey[];
	bigScrollUp: Hotkey[];
	open: Hotkey[];
	openInNewPage: Hotkey[];
	focusNext: Hotkey[];
	focusPrevious: Hotkey[];
}
