export class ModeScope {
	private _depth = 0;

	get inSearchMode(): boolean {
		return this._depth > 0;
	}

	get depth(): number {
		return this._depth;
	}

	push() {
		this._depth++;
	}

	pop() {
		this._depth--;
		if (this.depth < 0) {
			throw "[ERROR in Core Search Assistant] ModeScope.depth < 0";
		}
	}

	reset() {
		this._depth = 0;
	}
}
