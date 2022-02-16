import type { Events } from 'obsidian';

interface LinkedNode<T> {
	entity: T;
	pre: LinkedNode<T> | undefined;
	next: LinkedNode<T> | undefined;
}

export class LinkedList<T> {
	head: LinkedNode<T> | undefined;
	tail: LinkedNode<T> | undefined;
	private unlinkedPool: Map<T, T>; // key: pre, value: cur
	private readonly events: Events;
	private readonly eventId: string;

	constructor(events: Events, eventId: string) {
		this.unlinkedPool = new Map<T, T>();
		this.events = events;
		this.eventId = eventId;
	}

	// attach nodes recursively
	structure(cur: T, pre: T | undefined) {
		let linked = false;

		// check if cur is root item
		if (pre === undefined) {
			this.setRoot(cur);
			linked = true;
			this.signal();
		}
		// check if cur can be attached
		else if (this.tail !== undefined && pre === this.tail.entity) {
			this.link(cur);
			linked = true;
			this.unlinkedPool.delete(cur);
			this.signal();
		}

		// find next sibling and attach it
		if (linked) {
			if (!this.unlinkedPool.has(cur)) {
				return;
			}

			const next = this.unlinkedPool.get(cur);
			if (next === undefined) {
				return;
			}
			this.structure(next, cur);
		} else {
			// pool sibling info
			if (pre) {
				this.unlinkedPool.set(pre, cur);
			}
		}
	}

	private setRoot(entity: T) {
		const rootNode: LinkedNode<T> = {
			entity: entity,
			pre: undefined,
			next: undefined,
		};
		this.head = rootNode;
		this.tail = rootNode;
	}

	private link(cur: T) {
		if (!this.tail) {
			return;
		}
		const currentTail = this.tail;
		currentTail.next = {
			entity: cur,
			pre: currentTail,
			next: undefined,
		};
		this.tail = currentTail.next;
	}

	clean() {
		this.head = undefined;
		this.tail = undefined;
		this.unlinkedPool = new Map<T, T>();
	}

	// let outside know a node is attached
	private signal() {
		this.events.trigger(this.eventId);
	}
}

// export function isLinkedEventInfo<T>(
// 	obj: unknown,
// 	cls: new () => T
// ): obj is LinkedEventInfo<T> {
// 	if (obj === null) {
// 		return false;
// 	}
// 	if (typeof obj !== 'object') {
// 		return false;
// 	}
// 	const { linked } = obj as UnknownObject<LinkedEventInfo<T>>;
// 	if (typeof linked !== 'object') {
// 		return false;
// 	}
// 	if (!(linked instanceof cls)) {
// 		return false;
// 	}
// 	return true;
// }
