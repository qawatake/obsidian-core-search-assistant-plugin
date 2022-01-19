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
		this.addChild(this.controller);
		this.coreSearchInterface = new CoreSearchInterface(this.app, this);
		this.addChild(this.coreSearchInterface);
		this.workspacePreview = new WorkspacePreview(this.app, this);
		this.addChild(this.workspacePreview);
		this.cardView = new CardView(this.app, this);
		this.addChild(this.cardView);

		await this.loadSettings();

		this.addSettingTab(new CoreSearchAssistantSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			const inputEl = this.coreSearchInterface?.getSearchInput();
			if (!inputEl) {
				return;
			}

			this.registerDomEvent(document, 'click', () => {
				this.controller?.exit();
			});
			this.registerDomEvent(inputEl, 'click', (evt) => {
				evt.stopPropagation();
				if (!this.controller?.inSearchMode()) {
					this.controller?.enter();
				}
			});

			// x "keydown" → capture Ctrl + Enter key
			// x "keypress" → do not recognize Backspace key
			this.registerDomEvent(inputEl, 'input', () => {
				if (!this.controller?.inSearchMode()) {
					this.controller?.enter();
				}
				this.controller?.reset();
			});
			this.registerDomEvent(inputEl, 'focus', () => {
				if (!this.controller?.inSearchMode()) {
					this.controller?.enter();
				}
			});
		});
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
