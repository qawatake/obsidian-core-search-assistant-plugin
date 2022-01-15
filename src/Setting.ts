import CoreSearchAssistantPlugin from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export interface CoreSearchAssistantPluginSettings {
	keepSelectedItemsCentered: boolean;
	outlineWidth: number;
	autoPreview: boolean;
}

const AVAILABLE_OUTLINE_WIDTHS = [0, 3, 5, 7, 10] as const;

const DEFAULT_OUTLINE_WIDTH = AVAILABLE_OUTLINE_WIDTHS[2];

export const DEFAULT_SETTINGS: CoreSearchAssistantPluginSettings = {
	keepSelectedItemsCentered: true,
	outlineWidth: DEFAULT_OUTLINE_WIDTH,
	autoPreview: true,
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
						if (!this.plugin.settings) {
							return;
						}
						this.plugin.settings.outlineWidth =
							Number.parseInt(value);
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Auto preview')
			.setDesc('Preview automatically appears when selected')
			.addToggle((component) => {
				component
					.setValue(
						this.plugin.settings?.autoPreview ??
							DEFAULT_SETTINGS.autoPreview
					)
					.onChange((value) => {
						if (!this.plugin.settings) {
							return;
						}
						this.plugin.settings.autoPreview = value;
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
