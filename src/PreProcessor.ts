import { Match } from 'obsidian';

// WARNING: attr "data-id" will be overwritten
export function highlightMatches(
	content: string,
	matches: Match[],
	o?: DomElementInfo
): string {
	let processed = '';
	let currentPos = 0;
	matches.forEach((match, id) => {
		const [start, end] = match;
		processed += content.slice(currentPos, start);
		const spanEl = createEl('span', {
			...o,
			...{ attr: { 'data-id': id } },
		});
		spanEl.textContent = content.slice(start, end);
		processed += spanEl.outerHTML;
		currentPos = end;
	});
	processed += content.slice(currentPos);
	return processed;
}
