import type CoreSearchAssistantPlugin from 'main';
import {
	App,
	type Hotkey,
	PluginSettingTab,
	Setting,
	type SplitDirection,
	Scope,
	type Modifier,
	Platform,
	Keymap,
} from 'obsidian';
import type { SvelteComponent } from 'svelte';
import HotkeySetting from 'ui/HotkeySetting.svelte';

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
	svelteComponents: SvelteComponent[];
	scope: Scope | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.svelteComponents = [];
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
		Object.keys(settings.searchModeHotkeys).forEach((key) => {
			const hotkeys = settings.searchModeHotkeys[key] as Hotkey[];
			new Setting(containerEl).setName(key).then((setting) => {
				const hotkeyContainerEl = setting.controlEl.createDiv({
					cls: 'setting-command-hotkeys',
				});
				hotkeys.forEach((hotkey) => {
					const hotkeySetting = new HotkeySetting({
						target: hotkeyContainerEl,
						props: {
							hotkey,
						},
					});
					hotkeySetting.$on('removed', () => {
						hotkeySetting.$destroy();
						(settings.searchModeHotkeys[key] as Hotkey[]).remove(
							hotkey
						);
						this.plugin.saveSettings();
					});
					this.svelteComponents.push(hotkeySetting);
				});

				setting
					.addExtraButton((component) => {
						component
							.setIcon('reset')
							.setTooltip('Restore default')
							.onClick(async () => {
								const defaultHotkeys = [
									...(DEFAULT_SETTINGS.searchModeHotkeys[
										key
									] ?? []),
								];
								if (!defaultHotkeys) return;
								settings.searchModeHotkeys[key] =
									defaultHotkeys;
								await this.plugin.saveSettings();
								this.display();
							});
					})
					.addExtraButton((component) => {
						component
							.setIcon('any-key')
							.setTooltip('Customize this command');
					});
			});
		});

		containerEl.createEl('h3', { text: 'Preview Modal' });
		Object.keys(settings.previewModalHotkeys).forEach((key) => {
			const hotkeys = settings.previewModalHotkeys[key] as Hotkey[];
			new Setting(containerEl).setName(key).then((setting) => {
				const hotkeyContainerEl = setting.controlEl.createDiv({
					cls: 'setting-command-hotkeys',
				});
				hotkeys.forEach((hotkey) => {
					const hotkeySetting = new HotkeySetting({
						target: hotkeyContainerEl,
						props: {
							hotkey,
						},
					});
					hotkeySetting.$on('removed', () => {
						hotkeySetting.$destroy();
						(settings.previewModalHotkeys[key] as Hotkey[]).remove(
							hotkey
						);
						this.plugin.saveSettings();
						this.display();
					});
					this.svelteComponents.push(hotkeySetting);
				});

				setting
					.addExtraButton((component) => {
						component
							.setIcon('reset')
							.setTooltip('Restore default')
							.onClick(async () => {
								const defaultHotkeys = [
									...(DEFAULT_SETTINGS.previewModalHotkeys[
										key
									] ?? []),
								];
								settings.previewModalHotkeys[key] =
									defaultHotkeys;
								await this.plugin.saveSettings();
								this.display();
							});
					})
					.addExtraButton((component) => {
						component
							.setIcon('any-key')
							.setTooltip('Customize this command')
							.onClick(() => {
								this.scope = new Scope();
								this.app.keymap.pushScope(this.scope);
								// this.scope.register([], 'Escape', () => {
								// 	console.log('escape');
								// 	if (this.scope)
								// 		this.app.keymap.popScope(this.scope);
								// });
								this.scope.register([], null, (evt) => {
									const hotkey = extractHotkey(evt);
									const shouldAddHotkey =
										evt.key !== 'Escape' &&
										!settings.previewModalHotkeys[
											key
										]?.includes(hotkey);
									if (shouldAddHotkey) {
										settings.previewModalHotkeys[key]?.push(
											hotkey
										);
										const hotkeySetting = new HotkeySetting(
											{
												target: hotkeyContainerEl,
												props: {
													hotkey,
												},
											}
										);
										hotkeySetting.$on('removed', () => {
											hotkeySetting.$destroy();
											(
												settings.previewModalHotkeys[
													key
												] as Hotkey[]
											).remove(hotkey);
											this.plugin.saveSettings();
											this.display();
										});
										this.svelteComponents.push(
											hotkeySetting
										);
										this.plugin.saveSettings();
									}
									if (this.scope)
										this.app.keymap.popScope(this.scope);
								});
							});
					});
			});
		});
	}

	override hide() {
		super.hide();
		this.svelteComponents.forEach((component) => {
			component.$destroy();
		});
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
			this.scope = undefined;
		}
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

function extractHotkey(evt: KeyboardEvent): Hotkey {
	const modifiers: Modifier[] = [];
	if (Keymap.isModifier(evt, 'Alt')) {
		modifiers.push('Alt');
	}
	if (Keymap.isModifier(evt, 'Shift')) {
		modifiers.push('Shift');
	}
	if (Keymap.isModifier(evt, 'Meta')) {
		modifiers.push('Meta');
	}
	if (Keymap.isModifier(evt, 'Mod')) {
		modifiers.push('Mod');
	}
	if (Keymap.isModifier(evt, 'Ctrl')) {
		modifiers.push('Ctrl');
	}
	return {
		modifiers,
		key: evt.key,
	};
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
