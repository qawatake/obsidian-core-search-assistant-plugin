import CoreSearchAssistantPlugin from 'main';
import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'WorkspacePreview';

export class PreviewModal extends Modal {
	file: TFile;
	plugin: CoreSearchAssistantPlugin;
	leaf: WorkspaceLeaf;

	constructor(app: App, plugin: CoreSearchAssistantPlugin, file: TFile) {
		super(app);
		this.plugin = plugin;
		this.file = file;
		this.leaf = new (WorkspaceLeaf as any)(app) as WorkspaceLeaf;
	}

	override onOpen() {
		this.renderPreview();

		// to prevent the modal immediately close
		// await new Promise((resolve) => setTimeout(resolve, 1));

		this.scope.register(['Ctrl'], ' ', () => {
			this.close();
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);

		// too fast to focus the selected item
		setTimeout(() => {
			// necessary because selection focus will be removed when preview modal closes.
			this.plugin.controller?.focus();
		}, 100);
	}

	private detachLater(millisecond: number) {
		if (!this.leaf) {
			return;
		}
		const leafToBeDetached = this.leaf;
		setTimeout(() => {
			leafToBeDetached.detach();
		}, millisecond);
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
