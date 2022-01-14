import CoreSearchAssistantPlugin from 'main';
import { App, Modal } from 'obsidian';

interface OptionItem {
	key: string;
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
				description: 'Toggle matching case',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleMatchingCase();
					this.shouldRecall = false;
				},
			},
			{
				key: 's',
				description: 'Toggle explanation of search term',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExplainSearch();
				},
			},
			{
				key: 'd',
				description: 'Toggle collapsing results',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleCollapseAll();
				},
			},
			{
				key: 'f',
				description: 'Toggle showing more context',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExtraContext();
				},
			},
			{
				key: 'g',
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
			entryEl.createEl('kbd', {
				text: item.key.toUpperCase(),
				cls: 'suggestion-hotkey',
			});
			entryEl.createEl('span', {
				text: item.description,
				cls: 'suggestion-content',
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
