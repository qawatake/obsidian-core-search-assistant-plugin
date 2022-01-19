import CoreSearchAssistantPlugin from 'main';
import { App, Component, TFile, WorkspaceLeaf } from 'obsidian';

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

	private reveal() {
		this.containerEl.show();
	}

	renew(file: TFile) {
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.show(file);
	}

	private show(file: TFile) {
		this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		this.leaf.openFile(file, { state: { mode: 'preview' } });
		this.containerEl.empty();
		this.containerEl.appendChild(this.leaf.containerEl);
		if (this.plugin.settings?.hideIframe) {
			this.containerEl.addClass('hide-iframe');
		}
		this.reveal();
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

	hide() {
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.containerEl.hide();
	}
}
