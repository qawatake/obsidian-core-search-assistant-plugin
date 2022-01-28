import CoreSearchAssistantPlugin from 'main';
import { ViewGenerator } from 'interfaces/ViewGenerator';
import { App, Component, SearchResultItem } from 'obsidian';

export const INTERVAL_MILLISECOND_TO_BE_DETACHED = 1000;

export class WorkspacePreview extends Component {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private containerEl: HTMLElement;
	private renderer: ViewGenerator | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.containerEl = this.createContainerEl();
	}

	override onload(): void {
		this.hide();

		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.rootSplit.containerEl.appendChild(
				this.containerEl
			);
		});
	}

	override onunload(): void {
		this.renderer?.unload();
		this.containerEl.empty();
		this.containerEl.remove();
	}

	renew(item: SearchResultItem) {
		this.requestUnloadRenderer(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.show(item);
	}

	hide() {
		this.containerEl.hide();
		this.requestUnloadRenderer(INTERVAL_MILLISECOND_TO_BE_DETACHED);
	}

	private createContainerEl(): HTMLElement {
		return createEl('div', {
			attr: {
				id: 'core-search-assistant_workspace-preview',
			},
		});
	}

	// delay detachment because otherwise ↓ occur
	// "Uncaught TypeError: Cannot read property 'onResize' of null"
	private requestUnloadRenderer(millisecond: number) {
		const { renderer } = this;
		this.renderer = undefined;
		setTimeout(() => {
			renderer?.unload();
		}, millisecond);
	}

	private async show(item: SearchResultItem) {
		const { containerEl } = this;
		containerEl.empty();
		this.renderer = await new ViewGenerator(
			this.app,
			containerEl,
			item.file
		).load('preview');
		containerEl.show();
		// await delay(1);
		// await this.renderer.togglePreview();

		// setTimeout(() => {
		// 	renderer.unload();
		// }, 3000);

		// this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		// await this.leaf.openFile(item.file, { state: { mode: 'preview' } });
		// this.containerEl.empty();
		// this.containerEl.appendChild(this.leaf.containerEl);
		// if (this.plugin.settings?.hideIframe) {
		// 	this.containerEl.addClass('hide-iframe');
		// }
		// this.containerEl.show();
		// console.log(this.leaf);
		// console.log(this.leaf.getViewState());
		// console.log(this.leaf.view.getState());

		// this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		// const { containerEl } = this;
		// const markdownView = new MarkdownView(this.leaf);
		// markdownView.setMode(markdownView.modes.preview);
		// markdownView.file = item.file;
		// markdownView.setViewData(item.content, true);
		// containerEl.empty();
		// containerEl.appendChild(markdownView.containerEl);
		// if (this.plugin.settings?.hideIframe) {
		// 	containerEl.addClass('hide-iframe');
		// }
		// containerEl.show();
	}

	// // delay detachment because otherwise ↓ occur
	// // "Uncaught TypeError: Cannot read property 'onResize' of null"
	// private detachLater(millisecond: number) {
	// 	if (!this.leaf) {
	// 		return;
	// 	}
	// 	const leafToBeDetached = this.leaf;
	// 	setTimeout(() => {
	// 		leafToBeDetached.detach();
	// 	}, millisecond);
	// }
}
