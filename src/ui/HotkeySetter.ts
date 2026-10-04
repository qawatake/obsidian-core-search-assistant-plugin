import { type App, type Hotkey, Scope } from "obsidian";
import type { SvelteComponent } from "svelte";
import HotkeyEntry from "ui/HotKeyEntry.svelte";
import { contain, getHotkey } from "utils/Keymap";

// must call `unload` when it is not necessary
export class HotkeySetter {
	private readonly app: App;
	private readonly containerEl: HTMLElement;
	private readonly text: string;
	private currentHotkeys: Hotkey[];
	private readonly defaultHotkeys: Hotkey[];
	private shouldReflect: (renewed: Hotkey[], added?: Hotkey) => boolean = (_) =>
		true;

	private scope: Scope | undefined;
	private component: SvelteComponent;

	constructor(
		app: App,
		containerEl: HTMLElement,
		text: string,
		currentHotkeys: Hotkey[],
		defaultHotkeys: Hotkey[],
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.text = text;
		this.currentHotkeys = [...currentHotkeys];
		this.defaultHotkeys = [...defaultHotkeys];
		this.component = this.attachComponent();
	}

	unload() {
		this.onunload();
	}

	/**
	 * @param cb : should return true if you want to adopt the current change
	 */
	onChanged(cb: (renewed: Hotkey[], added?: Hotkey) => boolean): HotkeySetter {
		this.shouldReflect = cb;
		return this;
	}

	private attachComponent(): SvelteComponent {
		const component = new HotkeyEntry({
			target: this.containerEl,
			props: {
				actionName: this.text,
				hotkeys: this.currentHotkeys,
			},
		});
		component.$on("removed", this.onRemoved);
		component.$on("restored", this.onRestored);
		component.$on("start-listening-keys", this.onStartListening);
		return component;
	}

	private onunload() {
		this.component?.$destroy();
		this.stopListening();
	}

	private onRestored = () => {
		const { component } = this;
		if (!component) return;
		const renewed = [...this.defaultHotkeys];
		if (this.shouldReflect(renewed)) {
			this.currentHotkeys = renewed;
			component.$set({
				hotkeys: renewed,
			});
		}
	};

	private onRemoved = (evt: any) => {
		const { component } = this;
		if (!component) return;
		if (!(evt instanceof CustomEvent)) return;
		const removed = evt.detail.removed as Hotkey;
		const renewed = [...this.currentHotkeys];
		renewed.remove(removed);
		if (this.shouldReflect(renewed)) {
			this.currentHotkeys = renewed;
			component.$set({
				hotkeys: renewed,
			});
		}
	};

	private onStartListening = () => {
		const { component } = this;
		if (!component) return;
		component.$set({
			listening: true,
		});
		// pressing the button again while listening must not leave the previous scope behind
		this.stopListening();
		this.scope = new Scope();
		this.app.keymap.pushScope(this.scope);
		this.scope.register(null as any, null, (evt) => {
			evt.preventDefault(); // to prevent scroll

			if (evt.key === "Escape") {
				component.$set({
					listening: false,
				});
				this.stopListening();
				return;
			}

			const hotkey = getHotkey(evt);
			const collision = contain(this.currentHotkeys, hotkey);
			if (collision) return;

			const renewed = [...this.currentHotkeys];
			renewed.push(hotkey);
			if (!this.shouldReflect(renewed, hotkey)) return;

			this.currentHotkeys = renewed;
			component.$set({
				hotkeys: renewed,
			});
			component.$set({
				listening: false,
			});
			this.stopListening();
		});
	};

	private stopListening() {
		if (!this.scope) return;
		this.app.keymap.popScope(this.scope);
		this.scope = undefined;
	}
}
