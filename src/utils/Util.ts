import type { Editor } from "obsidian";

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
	const line = (editor as any)?.cm?.state?.doc?.length;
	return typeof line === "number" ? line : undefined;
}

export async function retry<U>(
	cb: () => U | undefined,
	interval: number,
	trials: number,
	check: (got: U | undefined) => boolean = (got: U | undefined) =>
		got !== undefined,
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

function shallowClone<T>(obj: T): T {
	return Object.assign({}, obj);
}

function deepClone<T>(obj: T): T {
	if (obj === null) return obj;
	if (typeof obj !== "object") return obj;

	if (Array.isArray(obj)) {
		const clone = new Array(obj.length);
		obj.forEach((value, id) => {
			clone[id] = deepClone(value);
		});
		return clone as any;
	}

	const clone = shallowClone(obj);
	for (const key in clone) {
		const value = clone[key];
		clone[key] = deepClone(value);
	}
	return clone;
}

export function deepMerge<T>(a: T, b: T): T {
	if (b === undefined) {
		return deepClone(a);
	}
	if (a === undefined) {
		return deepClone(b);
	}

	if (typeof a !== typeof b) {
		throw new Error(`failed to deepMerge ${a} and ${b}`);
	}

	if (typeof b !== "object") return deepClone(b);
	if (b === null) {
		return deepClone(a);
	}
	if (a === null) {
		return deepClone(b);
	}

	if (Array.isArray(b)) {
		if (Array.isArray(a)) {
			return deepClone(b);
		}
		throw new Error(`failed to deepMerge ${a} and ${b}`);
	}
	if (Array.isArray(a)) {
		throw new Error(`failed to deepMerge ${a} and ${b}`);
	}

	const clone = shallowClone(a);
	for (const key in a) {
		clone[key] = deepMerge(a[key], b[key]);
	}
	for (const key in b) {
		clone[key] = deepMerge(a[key], b[key]);
	}
	return clone;
}
