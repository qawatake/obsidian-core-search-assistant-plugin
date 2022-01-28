import { Controller } from 'Controller';
import { SearchComponentInterface } from 'SearchComponentInterface';
import { Plugin } from 'obsidian';
import {
	CoreSearchAssistantPluginSettings,
	CoreSearchAssistantSettingTab,
	DEFAULT_SETTINGS,
} from 'Setting';

export default class CoreSearchAssistantPlugin extends Plugin {
	settings: CoreSearchAssistantPluginSettings | undefined;
	controller: Controller | undefined;
	SearchComponentInterface: SearchComponentInterface | undefined;
	// workspacePreview: WorkspacePreview | undefined;
	// cardView: CardView | undefined;

	override async onload() {
		this.controller = this.addChild(new Controller(this.app, this));
		this.SearchComponentInterface = this.addChild(
			new SearchComponentInterface(this.app, this)
		);
		// this.workspacePreview = this.addChild(
		// 	new WorkspacePreview(this.app, this)
		// );
		// this.cardView = this.addChild(new CardView(this.app, this));

		this.watchLayoutChange();

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

	private renewController() {
		if (this.controller) {
			this.removeChild(this.controller);
		}
		this.controller = this.addChild(new Controller(this.app, this));
	}

	// private renewCardView() {
	// 	if (this.cardView) {
	// 		this.removeChild(this.cardView);
	// 	}
	// 	this.cardView = this.addChild(new CardView(this.app, this));
	// }

	private watchLayoutChange() {
		// ↓ is necessary to skip layout-change when Obsidian reload
		this.app.workspace.onLayoutReady(() => {
			// ↓ is necessary because dom elements such as input form and containerEl for card view will be removed when layout change
			this.app.workspace.on('layout-change', () => {
				if (this.controller?.layoutChanged) {
					this.renewController();
					// this.renewCardView();
				}
			});
		});
	}
}
