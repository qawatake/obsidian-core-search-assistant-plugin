import { Controller } from 'Controller';
import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';

export class ExampleModal extends Modal {
	file: TFile;
	controller: Controller;

	constructor(app: App, controller: Controller, file: TFile) {
		super(app);
		this.controller = controller;
		this.file = file;
	}

	async onOpen() {
		this.renderPreview();

		// to prevent the modal immediately close
		await new Promise((resolve) => setTimeout(resolve, 1));

		// Scope is not available because it does not listen key events when modal is open
		document.addEventListener('keydown', this.closeModalKeymapHandler);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		document.removeEventListener('keydown', this.closeModalKeymapHandler);
		setTimeout(() => this.controller.focus(), 100);
	}

	renderPreview() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass(
			'core-search-assistant_preview-modal-leaf-container'
		);

		const leaf = new WorkspaceLeaf(this.app);
		contentEl.appendChild(leaf.containerEl);
		leaf.openFile(this.file, { state: { mode: 'preview' } });
	}

	closeModalKeymapHandler = (evt: Event) => {
		if (!(evt instanceof KeyboardEvent)) {
			return;
		}
		if (!(evt.ctrlKey && evt.key === 'Enter')) {
			return;
		}
		this.close();
	};
}
