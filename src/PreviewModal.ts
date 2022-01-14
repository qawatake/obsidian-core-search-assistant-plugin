import CoreSearchAssistantPlugin from 'main';
import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';

export class PreviewModal extends Modal {
	file: TFile;
	plugin: CoreSearchAssistantPlugin;
	leaf: WorkspaceLeaf;

	constructor(app: App, plugin: CoreSearchAssistantPlugin, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.file = file;
		// this.leaf = new WorkspaceLeaf(app);
		this.leaf = this.app.workspace.getLeaf(true);
	}

	override onOpen() {
		this.renderPreview();

		// to prevent the modal immediately close
		// await new Promise((resolve) => setTimeout(resolve, 1));

		this.scope.register(['Ctrl'], 'Enter', () => {
			this.close();
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.leaf.detach();

		setTimeout(() => {
			this.plugin.controller?.recall();
		}, 100);
	}

	renderPreview() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(
			'core-search-assistant_preview-modal-leaf-container'
		);

		this.leaf.openFile(this.file, { state: { mode: 'preview' } });
		contentEl.appendChild(this.leaf.containerEl);
	}
}
