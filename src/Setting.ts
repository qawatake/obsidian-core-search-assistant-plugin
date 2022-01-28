import CoreSearchAssistantPlugin from 'main';
import { App, PluginSettingTab, Setting, SplitDirection } from 'obsidian';

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

export interface CoreSearchAssistantPluginSettings {
	keepSelectedItemsCentered: boolean;
	outlineWidth: AvailableOutlineWidth;
	autoPreviewMode: AutoPreviewMode;
	cardViewLayout: AvailableCardLayout;
	splitDirection: SplitDirection;
	hideIframe: boolean;
}

export const DEFAULT_SETTINGS: CoreSearchAssistantPluginSettings = {
	keepSelectedItemsCentered: false,
	outlineWidth: 5,
	autoPreviewMode: 'cardView',
	cardViewLayout: '2x3',
	splitDirection: 'horizontal',
	hideIframe: false,
};

export class CoreSearchAssistantSettingTab extends PluginSettingTab {
	plugin: CoreSearchAssistantPlugin;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
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
