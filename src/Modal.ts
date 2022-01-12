import { App, Modal, TFile, WorkspaceLeaf } from 'obsidian';

export class ExampleModal extends Modal {
	previewEl: HTMLElement;
	file: TFile;
	constructor(app: App, file: TFile) {
		super(app);
		this.previewEl = createDiv();
		this.file = file;
	}

	onOpen() {
		const { contentEl, containerEl } = this;
		this.renderPreview();
		contentEl.appendChild(this.previewEl);
		console.log(contentEl.querySelector('div.workspace-leaf-content'));
		containerEl.id = 'qawatake';

		// document.addEventListener('keydown', (ev) => {
		// 	console.log(ev.key);
		// 	if (ev.key === 'u') {
		// 		console.log(this.containerEl);
		// 		this.containerEl.createEl('div', {
		// 			attr: {
		// 				class: 'modal',
		// 				style: 'margin-top:10px',
		// 			},
		// 			text: 'XXXXXXXXXXXx',
		// 		});
		// 	} else {
		// 		console.log('error');
		// 	}
		// });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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
