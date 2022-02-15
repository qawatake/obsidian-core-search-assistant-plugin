import type { Editor } from 'obsidian';

export async function delay(millisecond: number) {
	await new Promise((resolve) => setTimeout(resolve, millisecond));
}

// if content of a file is too large, we need to call scrollIntoView many times
export function scrollIteration(editor: Editor): number | undefined {
	const line = lineCount(editor);
	if (line === undefined) {
		return undefined;
	}
	return Math.max(Math.floor(line / 1000), 1);
}

export function lineCount(editor: Editor): number | undefined {
	// we shoud use ↓, but ↓ always return "1"
	// return view.editor.lineCount();
	const line = (editor as any)?.['cm']?.['state']?.['doc']?.length;
	return typeof line === 'number' ? line : undefined;
}

export async function retry<U>(
	cb: () => U | undefined,
	interval: number,
	trials: number,
	check: (got: U | undefined) => boolean = (got: U | undefined) =>
		got !== undefined
): Promise<U | undefined> {
	for (let i = 0; i < trials; i++) {
		const got = cb();
		if (check(got)) {
			return got;
		}
		await delay(interval);
	}
	return undefined;
}
