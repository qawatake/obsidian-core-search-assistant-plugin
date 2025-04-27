import type { ViewGeneratorExtension } from "interfaces/ViewGenerator";
import {
	MarkdownView,
	type MarkdownViewModeType,
	type WorkspaceLeaf,
} from "obsidian";

export class MarkdownViewGeneratorExtension implements ViewGeneratorExtension {
	isMine(leaf: WorkspaceLeaf): boolean {
		return leaf.view instanceof MarkdownView;
	}

	async setViewMode(leaf: WorkspaceLeaf, mode: MarkdownViewModeType) {
		await leaf.view.setState(
			{
				...leaf.view.getState(),
				mode: mode,
			},
			{},
		);
	}

	async toggleViewMode(leaf: WorkspaceLeaf) {
		if (!(leaf.view instanceof MarkdownView)) return;
		await this.setViewMode(
			leaf,
			leaf.view.getMode() === "preview" ? "source" : "preview",
		);
	}
}
