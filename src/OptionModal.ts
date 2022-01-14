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
					this.plugin.coreSearchInterface?.toggleMatchingCase();
					this.shouldRecall = false;
				},
			},
			{
				id: 'explainSearch',
				key: 's',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExplainSearch();
				},
			},
			{
				id: 'collapseAll',
				key: 'd',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleCollapseAll();
				},
			},
			{
				id: 'extraContext',
				key: 'f',
				onChoose: () => {
					this.plugin.coreSearchInterface?.toggleExtraContext();
				},
			},
			{
				id: 'alphabetical',
				key: 'g',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'alphabetical'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
					this.shouldRecall = false;
				},
			},
			{
				id: 'alphabeticalReverse',
				key: 'h',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'alphabeticalReverse'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byModifiedTime',
				key: 'j',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byModifiedTime'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byModifiedTimeReverse',
				key: 'k',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byModifiedTimeReverse'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byCreatedTime',
				key: 'l',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byCreatedTime'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
					this.shouldRecall = false;
				},
			},
			{
				id: 'byCreatedTimeReverse',
				key: ';',
				onChoose: () => {
					this.plugin.coreSearchInterface?.setSortOrder(
						'byCreatedTimeReverse'
					);
					this.plugin.coreSearchInterface?.updateSortOrderEl();
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
		if (this.shouldRecall) {
			setTimeout(() => {
				this.plugin.controller?.recall();
			}, 100);
		}
	}
}
