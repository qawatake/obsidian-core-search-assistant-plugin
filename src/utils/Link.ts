import type {
	FrontMatterCache,
	HeadingCache,
	MetadataCache,
	TFile,
} from 'obsidian';

export function generateInternalLinkFrom(
	metadataCache: MetadataCache,
	file: TFile
): string {
	const link = metadataCache.fileToLinktext(file, '', true);
	const text = getDisplayText(metadataCache, file);
	return text !== undefined ? `[[${link} | ${text}]]` : `[[${link}]]`;
}

function getDisplayText(
	metadataCache: MetadataCache,
	file: TFile
): string | undefined {
	const cache = metadataCache.getFileCache(file);
	if (!cache) return undefined;

	// search 'title' from front matter
	const title = getTitle(cache.frontmatter);
	if (title !== undefined) {
		return title;
	}

	// search 'h1' from front matter
	const h1 = getFirstH1(cache.headings);
	if (h1 !== undefined) {
		return h1;
	}

	return undefined;
}

function getTitle(frontmatter?: FrontMatterCache): string | undefined {
	return frontmatter?.['title'];
}

function getFirstH1(headings: HeadingCache[] | undefined) {
	if (!headings) return undefined;
	for (const heading of headings) {
		if (heading.level !== 1) continue;
		return heading.heading;
	}
	return undefined;
}
