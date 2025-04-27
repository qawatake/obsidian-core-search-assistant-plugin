import { Controller } from "Controller";
import { CoreSearchAssistantEvents } from "Events";
import {
	type CoreSearchAssistantPluginSettings,
	CoreSearchAssistantSettingTab,
	DEFAULT_SETTINGS,
} from "Setting";
import { SearchComponentInterface } from "interfaces/SearchComponentInterface";
import { Plugin } from "obsidian";
import * as store from "ui/store";
import { deepMerge } from "utils/Util";

export default class CoreSearchAssistantPlugin extends Plugin {
	settings: CoreSearchAssistantPluginSettings | undefined;
	events: CoreSearchAssistantEvents | undefined;
	searchInterface: SearchComponentInterface | undefined;
	controller: Controller | undefined;

	override async onload() {
		await this.loadSettings();

		this.events = new CoreSearchAssistantEvents();
		// should be called before adding controller because controller depends on searchInterface
		this.searchInterface = this.addChild(
			new SearchComponentInterface(this.app, this, this.events),
		);
		this.controller = this.addChild(
			new Controller(this.app, this, this.events, this.searchInterface),
		);

		this.watchLayoutChange();

		this.setSvelteStoreValues();

		this.addSettingTab(new CoreSearchAssistantSettingTab(this.app, this));
	}

	// override onunload() {}

	async loadSettings() {
		this.settings = deepMerge(DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private renewController() {
		if (this.controller) {
			this.removeChild(this.controller);
		}
		if (this.events === undefined) {
			throw "[ERROR in Core Search Interface] failed to renewController: plugin.events = undefined";
		}
		if (this.searchInterface === undefined) {
			throw "[ERROR in Core Search Interface] failed to renewController: plugin.searchInterface = undefined";
		}
		this.controller = this.addChild(
			new Controller(this.app, this, this.events, this.searchInterface),
		);
	}

	private watchLayoutChange() {
		// ↓ is necessary to skip layout-change when Obsidian reload
		this.app.workspace.onLayoutReady(() => {
			// ↓ is necessary because dom elements such as input form and containerEl for card view will be removed when layout change
			this.app.workspace.on("layout-change", async () => {
				if (await this.controller?.layoutChanged()) {
					this.renewController();
				}
			});
		});
	}

	private setSvelteStoreValues() {
		store.plugin.set(this);
		store.app.set(this.app);
	}
}
