import CoreSearchAssistantPlugin from 'main';
import { App, TFile, WorkspaceLeaf } from 'obsidian';

export const INTERVAL_MILLISECOND_TO_BE_DETACHED = 1000;

export class WorkspacePreview {
	app: App;
	plugin: CoreSearchAssistantPlugin;
	workspaceCoverEl: HTMLDivElement;
	leaf: WorkspaceLeaf | undefined;

	constructor(app: App, plugin: CoreSearchAssistantPlugin) {
		this.app = app;
		this.plugin = plugin;
		this.workspaceCoverEl = createEl('div', {
			attr: {
				id: 'core-search-assistant_workspace-preview-cover',
			},
		});
		this.hide();

		this.app.workspace.onLayoutReady(() => {
			this.app.workspace.rootSplit.containerEl.appendChild(
				this.workspaceCoverEl
			);
		});
	}

	private reveal() {
		this.workspaceCoverEl.style.display = 'initial';
	}

	renew(file: TFile) {
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);
		this.show(file);
	}

	private show(file: TFile) {
		this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		this.leaf.openFile(file, { state: { mode: 'preview' } });
		this.workspaceCoverEl.empty();
		this.workspaceCoverEl.appendChild(this.leaf.containerEl);
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
		this.leaf?.detach();
		this.workspaceCoverEl.style.display = 'none';
	}

	clean() {
		this.leaf?.detach();
		this.workspaceCoverEl.remove();
	}
}
