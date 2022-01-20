import { CardView } from 'components/CardView';
import { Controller } from 'Controller';
import { SearchComponentInterface } from 'SearchComponentInterface';
import { Plugin } from 'obsidian';
import {
	CoreSearchAssistantPluginSettings,
	CoreSearchAssistantSettingTab,
	DEFAULT_SETTINGS,
} from 'Setting';
import { WorkspacePreview } from 'components/WorkspacePreview';

export default class CoreSearchAssistantPlugin extends Plugin {
	settings: CoreSearchAssistantPluginSettings | undefined;
	controller: Controller | undefined;
	SearchComponentInterface: SearchComponentInterface | undefined;
	workspacePreview: WorkspacePreview | undefined;
	cardView: CardView | undefined;

	override async onload() {
		this.controller = new Controller(this.app, this);
		this.addChild(this.controller);
		this.SearchComponentInterface = new SearchComponentInterface(
			this.app,
			this
		);
		this.addChild(this.SearchComponentInterface);
		this.workspacePreview = new WorkspacePreview(this.app, this);
		this.addChild(this.workspacePreview);
		this.cardView = new CardView(this.app, this);
		this.addChild(this.cardView);

		await this.loadSettings();

		this.addSettingTab(new CoreSearchAssistantSettingTab(this.app, this));
	}

	// override onunload() {}

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
