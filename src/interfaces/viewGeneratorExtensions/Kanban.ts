import type { ViewGeneratorExtension } from 'interfaces/ViewGenerator';
import {
	Plugin,
	TextFileView,
	type App,
	type MarkdownViewModeType,
	type WorkspaceLeaf,
} from 'obsidian';
import type { UnknownObject } from 'types/Guards';

const kanbanPluginId = 'obsidian-kanban';
// defined in https://github.com/mgmeyers/obsidian-kanban/blob/8a9a734b723b7f396a1c2c1a3ae22c0daab4e98e/src/parsers/common.ts#L8
const frontMatterKey = 'kanban-plugin';
// defined in https://github.com/mgmeyers/obsidian-kanban/blob/7d6a7fe709b3032b27121a2ec44dd53dedf46b6b/src/KanbanView.tsx#L25
const kanbanViewType = 'kanban';

export class KanbanViewGeneratorExtension implements ViewGeneratorExtension {
	kanban: KanbanPlugin | undefined;

	constructor(private readonly app: App) {
		const kanban = this.app.plugins.plugins[kanbanPluginId] as any;
		if (IsKanbanPlugin(kanban)) {
			this.kanban = kanban;
		}
		if (kanban === undefined) {
			console.log(
				'[ERROR in Core Search Assistant] failed to fetch kanban plugin'
			);
			this.kanban = undefined;
		}
	}

	isMine(leaf: WorkspaceLeaf): boolean {
		const { view } = leaf;
		if (view.getViewType() == kanbanViewType) return true;
		if (!(view instanceof TextFileView)) return false;
		const fileCache = this.app.metadataCache.getFileCache(view.file);
		const fileIsKanban =
			!!fileCache?.frontmatter && !!fileCache.frontmatter[frontMatterKey];
		return fileIsKanban;
	}

	// https://github.com/mgmeyers/obsidian-kanban/blob/350fc891a8489f70551d288ae914534424c8c095/src/main.ts#L317-L345
	async setViewMode(leaf: WorkspaceLeaf, mode: MarkdownViewModeType) {
		const { kanban } = this;
		if (!kanban) return;
		if (mode === 'source') {
			kanban.kanbanFileModes[leaf.id] = 'markdown';
			await kanban.setMarkdownView(leaf);
			await leaf.view.setState(
				{
					...leaf.view.getState(),
					mode: 'source',
				},
				{}
			);
		} else {
			kanban.kanbanFileModes[leaf.id] = kanbanViewType;
			await kanban.setKanbanView(leaf);
		}
	}

	async toggleViewMode(leaf: WorkspaceLeaf) {
		const { kanban } = this;
		if (!kanban) return;
		const mode = kanban.kanbanFileModes[leaf.id];
		await this.setViewMode(
			leaf,
			mode === 'markdown' ? 'preview' : 'source'
		);
	}
}

interface KanbanPlugin extends Plugin {
	readonly kanbanFileModes: Record<string, string>;
	setMarkdownView(leaf: WorkspaceLeaf, focus?: boolean): Promise<void>;
	setKanbanView(leaf: WorkspaceLeaf): Promise<void>;
}

function IsKanbanPlugin(plugin: unknown): plugin is KanbanPlugin {
	if (!(plugin instanceof Plugin)) return false;

	const { kanbanFileModes, setKanbanView, setMarkdownView } =
		plugin as UnknownObject<KanbanPlugin>;
	if (typeof kanbanFileModes !== 'object') return false;
	if (typeof setMarkdownView !== 'function') return false;
	if (typeof setKanbanView !== 'function') return false;
	return true;
}
