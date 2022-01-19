import CoreSearchAssistantPlugin from 'main';
import { App, Modal, setIcon } from 'obsidian';
import { SearchOptionId, searchOptions } from 'types/Option';

interface OptionItem {
	id: SearchOptionId;
	key: string;
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
				id: 'matchingCase',
				key: 'a',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.toggleMatchingCase();
					this.shouldRecall = false;
				},
			},
			{
				id: 'explainSearch',
				key: 's',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.toggleExplainSearch();
				},
			},
			{
				id: 'collapseAll',
				key: 'd',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.toggleCollapseAll();
				},
			},
			{
				id: 'extraContext',
				key: 'f',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.toggleExtraContext();
				},
			},
			{
				id: 'alphabetical',
				key: 'g',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'alphabetical'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
					this.shouldRecall = false;
				},
			},
			{
				id: 'alphabeticalReverse',
				key: 'h',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'alphabeticalReverse'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byModifiedTime',
				key: 'j',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'byModifiedTime'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byModifiedTimeReverse',
				key: 'k',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'byModifiedTimeReverse'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byCreatedTime',
				key: 'l',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'byCreatedTime'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byCreatedTimeReverse',
				key: ';',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.setSortOrder(
						'byCreatedTimeReverse'
					);
					this.plugin.SearchComponentInterface?.renewSortOrderInfo();
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
		this.containerEl.addClass('core-search-assistant_option-modal');
		this.items.forEach((item) => {
			const entryEl = contentEl.createEl('div', {
				cls: 'suggestion-item',
			});
			const iconEl = entryEl.createEl('span', {
				cls: 'suggestion-icon',
			});
			setIcon(iconEl, searchOptions[item.id].iconId);
			entryEl.createEl('span', {
				text: searchOptions[item.id].description,
				cls: 'suggestion-content',
			});
			entryEl.createEl('kbd', {
				text: item.key.toUpperCase(),
				cls: 'suggestion-hotkey',
			});
		});
	}

	override onClose() {
		const { containerEl } = this;
		containerEl.empty();
	}
}
