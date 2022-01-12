const seenProperties: Set<string> = new Set();

export function findPropertyOwnerRecursively(
	target: any,
	property: string
): object | undefined {
	if (typeof target !== 'object' || target === null) {
		return undefined;
	}
	if (property in target) {
		return target;
	}
	for (const [childname, child] of Object.entries(target)) {
		if (seenProperties.has(childname)) {
			continue;
		}
		seenProperties.add(childname);
		const owner = findPropertyOwnerRecursively(child, property);
		if (owner) {
			return owner;
		}
	}
	return undefined;
}
