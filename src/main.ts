import { CardView } from 'CardView';
import { Controller } from 'Controller';
import { CoreSearchInterface } from 'CoreSearchInterface';
import { Plugin } from 'obsidian';
import {
	CoreSearchAssistantPluginSettings,
	CoreSearchAssistantSettingTab,
	DEFAULT_SETTINGS,
} from 'Setting';
import { WorkspacePreview } from 'WorkspacePreview';

export default class CoreSearchAssistantPlugin extends Plugin {
	settings: CoreSearchAssistantPluginSettings | undefined;
	controller: Controller | undefined;
	coreSearchInterface: CoreSearchInterface | undefined;
	workspacePreview: WorkspacePreview | undefined;
	cardView: CardView | undefined;

	override async onload() {
		this.controller = new Controller(this.app, this);
		this.coreSearchInterface = new CoreSearchInterface(this.app, this);
		this.workspacePreview = new WorkspacePreview(this.app, this);
		this.cardView = new CardView(this.app, this);

		await this.loadSettings();

		this.addSettingTab(new CoreSearchAssistantSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}

			this.registerDomEvent(inputEl, 'blur', () => {
				this.controller?.exit();
			});
			this.registerDomEvent(inputEl, 'input', () => {
				this.controller?.reset();
			});
			this.registerDomEvent(inputEl, 'focus', () => {
				this.controller?.enter();
			});

			const sortOrderSettingButtonEl =
				this.coreSearchInterface?.getSortOrderSettingButton();
			if (!sortOrderSettingButtonEl) {
				return;
			}
			this.registerDomEvent(sortOrderSettingButtonEl, 'click', () => {
				this.coreSearchInterface?.watchSortOrderChangeByClick();
			});
		});
	}

	override onunload() {
		this.controller?.clean();
		this.coreSearchInterface?.clean();
		this.workspacePreview?.clean();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
