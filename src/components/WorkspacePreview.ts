import CoreSearchAssistantPlugin from 'main';
import { MarkdownViewRenderer } from 'MarkdownViewRenderer';
import { App, Component, SearchResultItem, WorkspaceLeaf } from 'obsidian';

export const INTERVAL_MILLISECOND_TO_BE_DETACHED = 1000;

export class WorkspacePreview extends Component {
	private app: App;
	private plugin: CoreSearchAssistantPlugin;
	private containerEl: HTMLDivElement;
	private leaf: WorkspaceLeaf | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.containerEl = createEl('div', {
			attr: {
				id: 'core-search-assistant_workspace-preview',
			},
		});
		this.hide();

		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.rootSplit.containerEl.appendChild(
				this.containerEl
			);
		});
	}

	override onunload(): void {
		this.leaf?.detach();
		this.containerEl.empty();
		this.containerEl.remove();
	}

	renew(item: SearchResultItem) {
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.show(item);
	}

	hide() {
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.containerEl.hide();
	}

	private async show(item: SearchResultItem) {
		this.containerEl.empty();
		const renderer = await new MarkdownViewRenderer(
			this.app,
			this.containerEl,
			item.file
		).load();
		renderer.toggleSource();
		this.containerEl.show();
		setTimeout(() => {
			renderer.togglePreview();
		}, 1000);
		setTimeout(() => {
			renderer.toggleSource();
		}, 2000);
		setTimeout(() => {
			console.log('highlight');
			renderer.highlightMatches(item.result.content ?? []);
		}, 3000);
		console.log('item.length', item.result.content?.length);
		item.result.content?.forEach((match, i) => {
			const id = i;
			setTimeout(() => {
				renderer.focusOn(match, true);
			}, 4000 + id * 1000);
		});

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

	// delay detachment because otherwise ↓ occur
	// "Uncaught TypeError: Cannot read property 'onResize' of null"
	private detachLater(millisecond: number) {
		if (!this.leaf) {
			return;
		}
		const leafToBeDetached = this.leaf;
		setTimeout(() => {
			leafToBeDetached.detach();
		}, millisecond);
	}
}
