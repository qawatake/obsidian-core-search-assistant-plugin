import { Controller } from 'Controller';
import { CoreSearchInterface } from 'CoreSearchInterface';
import { Plugin } from 'obsidian';

import { AppExtension } from './uncover';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings | undefined;
	controller: Controller | undefined;
	coreSearchInterface: CoreSearchInterface | undefined;

	override async onload() {
		const app = this.app as AppExtension;

		this.controller = new Controller(this.app, this).setup();
		this.coreSearchInterface = new CoreSearchInterface(this.app);

		this.app.workspace.onLayoutReady(() => {
			console.log(this.coreSearchInterface?.getSearchLeaf());
			console.log(this.coreSearchInterface?.getSearchView());
		});

		this.app.scope.register(['Ctrl'], '1', () => {
			this.coreSearchInterface?.toggleMatchingCase();
		});
		this.app.scope.register(['Ctrl'], '2', () => {
			this.coreSearchInterface?.toggleExplainSearch();
		});
		this.app.scope.register(['Ctrl'], '3', () => {
			this.coreSearchInterface?.toggleCollapseAll();
		});
		this.app.scope.register(['Ctrl'], '4', () => {
			this.coreSearchInterface?.toggleExtraContext();
		});
		this.app.scope.register(['Ctrl'], '5', () => {
			this.coreSearchInterface
				?.getSearchView()
				?.setSortOrder('byCreatedTime');
		});
		this.app.scope.register(['Ctrl'], '6', () => {
			this.coreSearchInterface
				?.getSearchView()
				?.setSortOrder('byModifiedTime');
		});
		this.app.scope.register(['Ctrl'], '7', () => {
			console.log(
				this.coreSearchInterface?.getSearchView()?.dom.children
			);
		});
		this.app.scope.register(['Ctrl'], '8', (evt) => {
			const child = this.coreSearchInterface?.getSearchView()?.dom
				.children[0] as any;
			console.log(
				this.coreSearchInterface?.getSearchView()?.dom.children
			);
			console.log(
				this.coreSearchInterface?.getSearchView()?.dom.children[0]
			);
			// console.log('getNextPos', child.getNextPos());
			// console.log('getPrevPos', child.getPrevPos());
			// evt.defaultPrevented = false;
			// console.log('onResultClick', child.onResultClick(evt, true));
		});

		// this.app.workspace.onLayoutReady(() => {
		// 	const child = this.coreSearchInterface?.getSearchView()?.dom
		// 		.children[0] as any;
		// 	console.log('getNextPos', child.getNextPos());
		// 	console.log('getPrevPos', child.getPrevPos());
		// 	console.log('renderContentMatches', child.renderContentMatches());
		// });

		console.log(app);

		await this.loadSettings();
	}

	// onunload() {}

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
