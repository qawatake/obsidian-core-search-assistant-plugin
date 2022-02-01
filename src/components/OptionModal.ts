import { CoreSearchAssistantEvents } from 'Events';
import CoreSearchAssistantPlugin from 'main';
import { ModeScope } from 'ModeScope';
import { App, Modal, setIcon } from 'obsidian';
import { SearchOptionId, searchOptions } from 'types/Option';

interface OptionItem {
	id: SearchOptionId;
	key: string;
	onChoose: () => void;
}

export class OptionModal extends Modal {
	private readonly plugin: CoreSearchAssistantPlugin;
	private readonly modeScope: ModeScope;
	private readonly items: OptionItem[];

	constructor(
		app: App,
		plugin: CoreSearchAssistantPlugin,
		modeScope: ModeScope,
		events: CoreSearchAssistantEvents
	) {
		super(app);
		this.plugin = plugin;
		this.modeScope = modeScope;

		this.items = [
			{
				id: 'matchingCase',
				key: 'a',
				onChoose: () => {
					this.plugin.searchInterface?.toggleMatchingCase();
					this.plugin.searchInterface?.renewSortOrderInfo(events);
					// this.plugin.controller?.reset();
					// renewCardPageView is not needed because the internal plugin definitely reloads
				},
			},
			{
				id: 'explainSearch',
				key: 's',
				onChoose: () => {
					this.plugin.searchInterface?.toggleExplainSearch();
				},
			},
			{
				id: 'collapseAll',
				key: 'd',
				onChoose: () => {
					this.plugin.searchInterface?.toggleCollapseAll();
				},
			},
			{
				id: 'extraContext',
				key: 'f',
				onChoose: () => {
					this.plugin.searchInterface?.toggleExtraContext();
				},
			},
			{
				id: 'alphabetical',
				key: 'g',
				onChoose: () => {
					const changed =
						this.plugin.searchInterface?.setSortOrder(
							'alphabetical'
						);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'alphabeticalReverse',
				key: 'h',
				onChoose: () => {
					const changed = this.plugin.searchInterface?.setSortOrder(
						'alphabeticalReverse'
					);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byModifiedTime',
				key: 'j',
				onChoose: () => {
					const changed =
						this.plugin.searchInterface?.setSortOrder(
							'byModifiedTime'
						);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byModifiedTimeReverse',
				key: 'k',
				onChoose: () => {
					const changed = this.plugin.searchInterface?.setSortOrder(
						'byModifiedTimeReverse'
					);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byCreatedTime',
				key: 'l',
				onChoose: () => {
					const changed =
						this.plugin.searchInterface?.setSortOrder(
							'byCreatedTime'
						);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
			{
				id: 'byCreatedTimeReverse',
				key: ';',
				onChoose: () => {
					const changed = this.plugin.searchInterface?.setSortOrder(
						'byCreatedTimeReverse'
					);
					if (changed) {
						this.plugin.searchInterface?.renewSortOrderInfo(events);
						// this.plugin.controller?.reset();
					}
				},
			},
		];
	}

	override onOpen() {
		this.modeScope.push();

		this.items.forEach((item) => {
			this.scope.register([], item.key, item.onChoose);
		});

		this.renderOptions();
	}

	override onClose() {
		const { containerEl } = this;
		containerEl.empty();

		// too fast to remain search mode
		setTimeout(() => this.modeScope.pop(), 100);
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
}
