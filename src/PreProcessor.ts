import { Match } from 'obsidian';

export function highlightMatches(
	content: string,
	matches: Match[],
	o?: DomElementInfo
): string {
	let processed = '';
	let currentPos = 0;
	matches.forEach((match) => {
		const [start, end] = match;
		processed += content.slice(currentPos, start);
		const spanEl = createEl('span', o);
		spanEl.textContent = content.slice(start, end);
		processed += spanEl.outerHTML;
		currentPos = end;
	});
	processed += content.slice(currentPos);
	return processed;
}
