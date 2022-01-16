import CoreSearchAssistantPlugin from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export interface CoreSearchAssistantPluginSettings {
	keepSelectedItemsCentered: boolean;
	outlineWidth: AvailableOutlineWidth;
	autoPreviewMode: AutoPreviewMode;
}

const AVAILABLE_OUTLINE_WIDTHS = [0, 3, 5, 7, 10] as const;

type AvailableOutlineWidth = typeof AVAILABLE_OUTLINE_WIDTHS[number];

const DEFAULT_OUTLINE_WIDTH = AVAILABLE_OUTLINE_WIDTHS[2];

const AUTO_PREVIEW_MODE_IDS = ['none', 'singleView', 'cardView'] as const;

type AutoPreviewMode = typeof AUTO_PREVIEW_MODE_IDS[number];

const autoPreviewModeInfos: Record<AutoPreviewMode, string> = {
	none: 'none',
	singleView: 'single view',
	cardView: 'card view',
};

const DEFAULT_AUTO_VIEW_MODE: AutoPreviewMode = 'singleView';

export const DEFAULT_SETTINGS: CoreSearchAssistantPluginSettings = {
	keepSelectedItemsCentered: false,
	outlineWidth: DEFAULT_OUTLINE_WIDTH,
	autoPreviewMode: 'singleView',
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
						this.plugin.settings?.autoPreviewMode ??
							DEFAULT_AUTO_VIEW_MODE
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
	}
}

export function validOutlineWidth(width: unknown): number {
	if (typeof width !== 'number') {
		return DEFAULT_OUTLINE_WIDTH;
	}
	if (!Number.isInteger(width)) {
		return DEFAULT_OUTLINE_WIDTH;
	}
	if (!AVAILABLE_OUTLINE_WIDTHS.includes(width as any)) {
		return DEFAULT_OUTLINE_WIDTH;
	}
	return width;
}
