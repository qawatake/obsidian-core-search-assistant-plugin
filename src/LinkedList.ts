interface LinkedNode<T> {
	entity: T;
	pre: LinkedNode<T> | undefined;
	next: LinkedNode<T> | undefined;
}

interface EventDispatcher {
	dispatchEvent(event: Event): boolean;
}

// interface LinkedEventInfo<T> {
// 	linked: T;
// }

export class LinkedList<T> {
	head: LinkedNode<T> | undefined;
	tail: LinkedNode<T> | undefined;
	private unlinkedPool: Map<T, T>; // key: pre, value: cur
	private readonly eventDispatcher: EventDispatcher;
	private readonly eventId: string;

	constructor(eventDispatcher: EventDispatcher, eventId: string) {
		this.unlinkedPool = new Map<T, T>();
		this.eventDispatcher = eventDispatcher;
		this.eventId = eventId;
	}

	// attach nodes recursively
	structure(cur: T, pre: T | undefined) {
		let linked = false;

		// check if cur is root item
		if (pre === undefined) {
			this.setRoot(cur);
			linked = true;
			this.signal(cur);
		}
		// check if cur can be attached
		else if (this.tail !== undefined && pre === this.tail.entity) {
			this.link(cur);
			linked = true;
			this.signal(cur);
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
			return;
		}

		// pool sibling info
		if (pre) {
			this.unlinkedPool.set(pre, cur);
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
	private signal(entity: T) {
		const event = new CustomEvent(this.eventId, {
			detail: { linked: entity },
		});
		this.eventDispatcher.dispatchEvent(event);
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
