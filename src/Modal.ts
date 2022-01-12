import {
	App,
	KeymapEventHandler,
	KeymapEventListener,
	Modal,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';

export class ExampleModal extends Modal {
	previewEl: HTMLElement;
	file: TFile;
	// keymapEventListeners: KeymapEventListener[];
	// backHandler: KeymapEventHandler;
	closeModalKeymapHandler: EventListener;
	constructor(app: App, file: TFile) {
		super(app);
		this.previewEl = createDiv();
		this.file = file;
	}

	async onOpen() {
		const { contentEl, containerEl } = this;
		this.renderPreview();
		contentEl.appendChild(this.previewEl);
		containerEl.id = 'qawatake';

		// to prevent the modal immediately close
		await new Promise((resolve) => setTimeout(resolve, 1));

		// Scope is not available because it does not listen key events when modal is open
		this.closeModalKeymapHandler = (evt: Event) => {
			if (!(evt instanceof KeyboardEvent)) {
				return;
			}
			if (!(evt.ctrlKey && evt.key === 'Enter')) {
				return;
			}
			this.close();
		};

		document.addEventListener('keydown', this.closeModalKeymapHandler);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		document.removeEventListener('keydown', this.closeModalKeymapHandler);
	}

	renderPreview() {
		this.previewEl.empty();
		this.createPane();
	}

	createPane() {
		// document.get
		const containerEl = this.previewEl.createDiv({
			cls: 'first',
			attr: {
				style: `height: 100%; width: 100%; display: inline-block`,
			},
		});
		const leaf = new WorkspaceLeaf(this.app);
		containerEl.appendChild(leaf.containerEl);
		// const state = leaf.getViewState();
		leaf.openFile(this.file, { state: { mode: 'preview' } });
		// console.log(leaf.getViewState());
		console.log(leaf);
	}
}
