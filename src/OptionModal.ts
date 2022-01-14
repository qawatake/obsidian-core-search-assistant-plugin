import CoreSearchAssistantPlugin from 'main';
import { App, Modal, setIcon } from 'obsidian';

interface OptionItem {
	key: string;
	iconId: string;
	description: string;
	onChoose: () => void;
}

export class OptionModal extends Modal {
	plugin: CoreSearchAssistantPlugin;
	items: OptionItem[];
	shouldRecall = true;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super(app);
		this.plugin = plugin;

		this.items = [
			{
				key: 'a',
				iconId: 'uppercase-lowercase-a',
				description: 'Toggle matching case',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleMatchingCase();
					this.shouldRecall = false;
				},
			},
			{
				key: 's',
				iconId: 'info',
				description: 'Toggle explanation of search term',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExplainSearch();
				},
			},
			{
				key: 'd',
				iconId: 'bullet-list',
				description: 'Toggle collapsing results',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleCollapseAll();
				},
			},
			{
				key: 'f',
				iconId: 'expand-vertically',
				description: 'Toggle showing more context',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExtraContext();
				},
			},
			{
				key: 'g',
				iconId: 'down-arrow-with-tail',
				description: 'Sort by file name (A → Z)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'alphabetical'
					);
					this.shouldRecall = false;
				},
			},
			{
				key: 'h',
				iconId: 'up-arrow-with-tail',
				description: 'Sort by file name (Z → A)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'alphabeticalReverse'
					);
					this.shouldRecall = false;
				},
			},
			{
				key: 'j',
				iconId: 'down-arrow-with-tail',
				description: 'Sort by modified time (new → old)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byModifiedTime'
					);
					this.shouldRecall = false;
				},
			},
			{
				key: 'k',
				iconId: 'up-arrow-with-tail',
				description: 'Sort by modified time (old → new)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byModifiedTimeReverse'
					);
					this.shouldRecall = false;
				},
			},
			{
				key: 'l',
				iconId: 'down-arrow-with-tail',
				description: 'Sort by created time (new → old)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byCreatedTime'
					);
					this.shouldRecall = false;
				},
			},
			{
				key: ';',
				iconId: 'up-arrow-with-tail',
				description: 'Sort by created time (old → new)',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byCreatedTimeReverse'
					);
					this.shouldRecall = false;
				},
			},
		];
	}

	override onOpen() {
		this.items.forEach((item) => {
			this.scope.register([], item.key, item.onChoose);
		});

		this.renderOptions();
	}

	renderOptions() {
		const { contentEl } = this;
		contentEl.empty();
		this.containerEl.addClass('core-search-assistant_option_modal');
		this.items.forEach((item) => {
			const entryEl = contentEl.createEl('div', {
				cls: 'suggestion-item',
			});
			const iconEl = entryEl.createEl('span', {
				cls: 'suggestion-icon',
			});
			setIcon(iconEl, item.iconId);
			entryEl.createEl('span', {
				text: item.description,
				cls: 'suggestion-content',
			});
			entryEl.createEl('kbd', {
				text: item.key.toUpperCase(),
				cls: 'suggestion-hotkey',
			});
		});
	}

	override onClose() {
		if (this.shouldRecall) {
			setTimeout(() => {
				this.plugin.controller?.recall();
			}, 100);
		}
	}
}
