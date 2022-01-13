import MyPlugin from 'main';
import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';

export class ExampleModal extends Modal {
	file: TFile;
	plugin: MyPlugin;
	leaf: WorkspaceLeaf;

	constructor(app: App, plugin: MyPlugin, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.file = file;
		this.leaf = new WorkspaceLeaf(app);
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
			this.plugin.controller?.popCurrentFocused();
			this.plugin.controller?.focus();
		}, 100);
	}

	renderPreview() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(
			'core-search-assistant_preview-modal-leaf-container'
		);

		contentEl.appendChild(this.leaf.containerEl);
		this.leaf.openFile(this.file, { state: { mode: 'preview' } });
	}
}
