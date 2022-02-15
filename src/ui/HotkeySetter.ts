import { App, Scope, type Hotkey } from 'obsidian';
import type { SvelteComponent } from 'svelte';
import HotkeyEntry from 'ui/HotkeyEntry.svelte';
import { getHotkey } from 'utils/Keymap';

// must call `unload` when it is not necessary
export class HotkeySetter {
	private readonly app: App;
	private readonly containerEl: HTMLElement;
	private readonly text: string;
	private currentHotkeys: Hotkey[];
	private readonly defaultHotkeys: Hotkey[];
	private shouldReflect: (renewed: Hotkey[], added?: Hotkey) => boolean = (
		_
	) => true;

	private scope: Scope | undefined;
	private svelteComponent: SvelteComponent;

	constructor(
		app: App,
		containerEl: HTMLElement,
		text: string,
		currentHotkeys: Hotkey[],
		defaultHotkeys: Hotkey[]
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.text = text;
		this.currentHotkeys = [...currentHotkeys];
		this.defaultHotkeys = [...defaultHotkeys];
		this.svelteComponent = this.attachComponent();
	}

	unload() {
		this.onunload();
	}

	/**
	 * @param cb : should return true if you want to adopt the current change
	 */
	onChanged(
		cb: (renewed: Hotkey[], added?: Hotkey) => boolean
	): HotkeySetter {
		this.shouldReflect = cb;
		return this;
	}

	private attachComponent(): SvelteComponent {
		const { containerEl, defaultHotkeys } = this;
		const hotkeyEntry = new HotkeyEntry({
			target: containerEl,
			props: {
				actionName: this.text,
				hotkeys: this.currentHotkeys,
			},
		});
		hotkeyEntry.$on('removed', (evt) => {
			if (!(evt instanceof CustomEvent)) return;
			const removed = evt.detail.removed as Hotkey;
			const renewed = [...this.currentHotkeys];
			renewed.remove(removed);
			if (this.shouldReflect(renewed)) {
				this.currentHotkeys = renewed;
				hotkeyEntry.$set({
					hotkeys: renewed,
				});
				console.log('removed');
			}
		});
		hotkeyEntry.$on('restored', () => {
			console.log('restored');
			const renewed = [...defaultHotkeys];
			if (this.shouldReflect(renewed)) {
				this.currentHotkeys = renewed;
				hotkeyEntry.$set({
					hotkeys: renewed,
				});
			}
		});
		hotkeyEntry.$on('start-listening-keys', () => {
			hotkeyEntry.$set({
				listening: true,
			});
			this.scope = new Scope();
			this.app.keymap.pushScope(this.scope);
			console.log('start');
			this.scope.register(null as any, null, (evt) => {
				evt.preventDefault(); // to prevent scroll
				const hotkey = getHotkey(evt);
				const shouldSkip =
					evt.key === 'Escape' ||
					this.currentHotkeys.includes(hotkey);
				if (!shouldSkip) {
					const renewed = [...this.currentHotkeys];
					renewed.push(hotkey);
					if (this.shouldReflect(renewed)) {
						this.currentHotkeys = renewed;
						hotkeyEntry.$set({
							hotkeys: renewed,
						});
					}
				}
				hotkeyEntry.$set({
					listening: false,
				});
				if (this.scope) this.app.keymap.popScope(this.scope);
			});
		});
		return hotkeyEntry;
	}

	private onunload() {
		this.svelteComponent?.$destroy();
		if (this.scope) {
			this.app.keymap.popScope(this.scope);
		}
		console.log('unloaded');
	}
}
