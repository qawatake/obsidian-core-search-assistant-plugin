import CoreSearchAssistantPlugin from 'main';
import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';
import { INTERVAL_MILLISECOND_TO_BE_DETACHED } from 'components/WorkspacePreview';

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
		this.plugin.controller?.togglePreviewModalShown(true);

		// to prevent the modal immediately close
		// await new Promise((resolve) => setTimeout(resolve, 1));

		this.scope.register(['Ctrl'], ' ', () => {
			this.shouldRestoreSelection = true;
			this.close();
		});

		this.scope.register(['Ctrl'], 'Enter', () => {
			this.plugin.controller?.open();
			this.plugin.controller?.exit();
			this.shouldRestoreSelection = false;
			this.close();
		});

		this.scope.register(['Ctrl', 'Shift'], 'Enter', () => {
			this.plugin.controller?.open('vertical');
			this.plugin.controller?.exit();
			this.shouldRestoreSelection = false;
			this.close();
		});
	}

	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.detachLater(INTERVAL_MILLISECOND_TO_BE_DETACHED);

		// too fast to remain search mode
		setTimeout(() => {
			this.plugin.controller?.togglePreviewModalShown(false);
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
		contentEl.addClass('core-search-assistant_preview-modal');

		this.leaf.openFile(this.file, { state: { mode: 'preview' } });
		contentEl.appendChild(this.leaf.containerEl);
	}
}
