import type { ViewGeneratorExtension } from 'interfaces/ViewGenerator';
import {
	type App,
	Plugin,
	type MarkdownViewModeType,
	type WorkspaceLeaf,
	MarkdownView,
} from 'obsidian';
import type { UnknownObject } from 'types/Guards';

// defined in https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/109fe05302bde0e8fe4e97c3bad6ca3f51f6b6b1/src/constants.ts#L15
const excalidrawPluginId = 'obsidian-excalidraw-plugin';
// defined in https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/109fe05302bde0e8fe4e97c3bad6ca3f51f6b6b1/src/constants.ts#L33
const excalidrawViewType = 'excalidraw';

export class ExcalidrawViewGeneratorExtension
	implements ViewGeneratorExtension
{
	excalidraw: ExcalidrawPlugin | undefined;

	constructor(private readonly app: App) {
		const excalidraw = this.app.plugins.plugins[excalidrawPluginId];
		if (!isExcalidrawPlugin(excalidraw)) {
			this.excalidraw = undefined;
		} else {
			this.excalidraw = excalidraw;
		}
	}

	isMine(leaf: WorkspaceLeaf): boolean {
		return leaf.view.getViewType() === excalidrawViewType;
	}

	// https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/109fe05302bde0e8fe4e97c3bad6ca3f51f6b6b1/src/main.ts#L953-L986
	async setViewMode(leaf: WorkspaceLeaf, mode: MarkdownViewModeType) {
		const { excalidraw } = this;
		if (!excalidraw) return;
		excalidraw.excalidrawFileModes[leaf.id] = 'markdown';
		await excalidraw.setMarkdownView(leaf);
		if (!(leaf.view instanceof MarkdownView)) return;
		await leaf.view.setState(
			{
				...leaf.view.getState(),
				mode: mode,
			},
			{}
		);
	}

	async toggleViewMode(leaf: WorkspaceLeaf) {
		const { excalidraw } = this;
		if (!excalidraw) return;
		excalidraw.excalidrawFileModes[leaf.id] = 'markdown';
		await excalidraw.setMarkdownView(leaf);
		if (!(leaf.view instanceof MarkdownView)) return;
		const mode = leaf.view.getMode();
		await leaf.view.setState(
			{
				...leaf.view.getState(),
				mode: mode === 'preview' ? 'source' : 'preview',
			},
			{}
		);
	}
}

interface ExcalidrawPlugin extends Plugin {
	readonly excalidrawFileModes: { [file: string]: string };
	setMarkdownView(leaf: WorkspaceLeaf): Promise<void>;
}

function isExcalidrawPlugin(plugin: unknown): plugin is ExcalidrawPlugin {
	if (!(plugin instanceof Plugin)) return false;

	const { excalidrawFileModes, setMarkdownView } =
		plugin as UnknownObject<ExcalidrawPlugin>;
	if (typeof excalidrawFileModes !== 'object') return false;
	if (typeof setMarkdownView !== 'function') return false;
	return true;
}
