import CoreSearchAssistantPlugin from 'main';
import {
	App,
	Component,
	MarkdownView,
	SearchResultItem,
	WorkspaceLeaf,
} from 'obsidian';

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

	private show(item: SearchResultItem) {
		// this.leaf.openFile(file, { state: { mode: 'preview' } });
		// this.containerEl.empty();
		// this.containerEl.appendChild(this.leaf.containerEl);
		// if (this.plugin.settings?.hideIframe) {
		// 	this.containerEl.addClass('hide-iframe');
		// }
		// this.containerEl.show();

		this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		const { containerEl } = this;
		const markdownView = new MarkdownView(this.leaf);
		markdownView.file = item.file;
		markdownView.setViewData(item.content, true);
		containerEl.empty();
		containerEl.appendChild(markdownView.containerEl);
		if (this.plugin.settings?.hideIframe) {
			containerEl.addClass('hide-iframe');
		}
		containerEl.show();
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
