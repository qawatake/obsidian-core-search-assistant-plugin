import type { ViewGeneratorExtension } from 'interfaces/ViewGenerator';
import {
	FileView,
	type MarkdownViewModeType,
	type WorkspaceLeaf,
} from 'obsidian';

// type SupportedFileFormat = typeof SUPPORTED_FILE_FORMATS[number];
const NON_MARKDOWN_FILE_TYPES = ['image', 'audio', 'pdf', 'video'] as const;
type NonMarkdownFileType = typeof NON_MARKDOWN_FILE_TYPES[number];

export class NonMarkdownViewGeneratorExtension
	implements ViewGeneratorExtension
{
	isMine(leaf: WorkspaceLeaf): boolean {
		if (!(leaf.view instanceof FileView)) return false;
		return NON_MARKDOWN_FILE_TYPES.includes(
			leaf.view.getViewType() as NonMarkdownFileType
		);
	}

	setViewMode(_leaf: WorkspaceLeaf, _mode: MarkdownViewModeType) {
		return;
	}

	toggleViewMode(_: WorkspaceLeaf) {
		return;
	}
}
