import { Controller } from 'Controller';
import { Plugin } from 'obsidian';
import { SearchAnalyzer, searchAnalyzer } from 'searchAnalyzer';
import { findPropertyOwnerRecursively } from 'Util';
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
	searchAnalyzer: SearchAnalyzer | undefined;

	override async onload() {
		const app = this.app as AppExtension;

		this.controller = new Controller(this.app, this).setup();
		this.searchAnalyzer = new SearchAnalyzer(this.app);

		// this.app.workspace.onLayoutReady(() => {
		// 	console.log(new SearchAnalyzer(this.app).getSearchView());
		// 	console.log(this.searchAnalyzer.collapseAll);
		// });

		// this.app.scope.register(['Ctrl'], '1', () => {
		// 	this.searchAnalyzer?.getSearchView()?.setMatchingCase(true);
		// });
		// this.app.scope.register(['Ctrl'], '2', () => {
		// 	this.searchAnalyzer?.getSearchView()?.setExplainSearch(true);
		// });
		// this.app.scope.register(['Ctrl'], '3', () => {
		// 	this.searchAnalyzer?.getSearchView()?.setCollapseAll(true);
		// });
		// this.app.scope.register(['Ctrl'], '4', () => {
		// 	this.searchAnalyzer.getSearchView()?.setExtraContext(true);
		// });
		// this.app.scope.register(['Ctrl'], '5', () => {
		// 	this.searchAnalyzer.getSearchView()?.setSortOrder('byCreatedTime');
		// });
		// this.app.scope.register(['Ctrl'], '6', () => {
		// 	this.searchAnalyzer.getSearchView()?.setSortOrder('byModifiedTime');
		// });

		console.log(app);
		// console.log(findPropertyOwnerRecursively(app, 'setConfig'));
		// console.log(findPropertyOwnerRecursively(app, 'sortOrder'));
		// console.log(this.app.vault.getConfig('fileSortOrder'));

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
