import CoreSearchAssistantPlugin from 'main';
import { App, TFile, WorkspaceLeaf } from 'obsidian';

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
		this.leaf?.detach();
		this.show(file);
	}

	private show(file: TFile) {
		this.leaf = new (WorkspaceLeaf as any)(this.app) as WorkspaceLeaf;
		this.leaf.openFile(file, { state: { mode: 'preview' } });
		this.workspaceCoverEl.empty();
		this.workspaceCoverEl.appendChild(this.leaf.containerEl);
		this.reveal();
	}

	hide() {
		this.leaf?.detach();
		this.workspaceCoverEl.style.display = 'none';
	}

	clean() {
		this.leaf?.detach();
		this.workspaceCoverEl.remove();
		console.log(this.workspaceCoverEl);
	}
}
