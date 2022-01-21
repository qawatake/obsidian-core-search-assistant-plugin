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

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super(app);
		this.plugin = plugin;

		this.items = [
			{
				id: 'matchingCase',
				key: 'a',
				onChoose: () => {
					this.plugin.SearchComponentInterface?.toggleMatchingCase();
					this.plugin.controller?.reset();
					// renewCardPageView is not needed because the internal plugin definitely reloads
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
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'alphabetical'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'alphabeticalReverse',
				key: 'h',
				onChoose: () => {
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'alphabeticalReverse'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byModifiedTime',
				key: 'j',
				onChoose: () => {
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'byModifiedTime'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byModifiedTimeReverse',
				key: 'k',
				onChoose: () => {
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'byModifiedTimeReverse'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byCreatedTime',
				key: 'l',
				onChoose: () => {
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'byCreatedTime'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byCreatedTimeReverse',
				key: ';',
				onChoose: () => {
					const changed =
						this.plugin.SearchComponentInterface?.setSortOrder(
							'byCreatedTimeReverse'
						);
					if (changed) {
						this.plugin.SearchComponentInterface?.renewSortOrderInfo();
						this.plugin.controller?.reset();
					}
				},
			},
		];
	}

	override onOpen() {
		this.items.forEach((item) => {
			this.scope.register([], item.key, item.onChoose);
		});

		this.renderOptions();
		this.plugin.controller?.toggleOptionModalShown(true);
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

		// too fast to remain search mode
		setTimeout(
			() => this.plugin.controller?.toggleOptionModalShown(false),
			100
		);
	}
}
