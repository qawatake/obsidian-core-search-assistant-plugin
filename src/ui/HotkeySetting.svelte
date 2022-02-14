<script lang="ts">
	import { Platform, setIcon, type Hotkey } from 'obsidian';
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';

	// props
	export let hotkey: Hotkey;

	// binds
	// let containerEl: HTMLElement | undefined;
	let iconContainerEl: HTMLSpanElement | undefined;

	// internal variables
	const dispatcher = createEventDispatcher();

	onMount(() => {
		if (iconContainerEl instanceof HTMLSpanElement) {
			setIcon(iconContainerEl, 'cross', 8);
		}
	});

	onDestroy(() => {
		console.log('removed');
	});

	function onIconClicked() {
		dispatcher('removed');
	}

	export function displayedText(hotkey: Hotkey): string {
		console.log(hotkey);
		const parts: string[] = [];
		const cmdExists =
			Platform.isMacOS &&
			(hotkey.modifiers.includes('Meta') ||
				hotkey.modifiers.includes('Mod'));
		const winExists =
			!Platform.isMacOS && hotkey.modifiers.includes('Meta');
		const ctrlExists =
			(!Platform.isMacOS && hotkey.modifiers.includes('Mod')) ||
			hotkey.modifiers.includes('Ctrl');
		if (cmdExists || winExists) {
			parts.push('⌘');
		}
		if (ctrlExists) {
			parts.push('⌃');
		}
		if (hotkey.modifiers.includes('Alt')) {
			parts.push('⌥');
		}
		if (hotkey.modifiers.includes('Shift')) {
			parts.push('⇧');
		}
		parts.push(convertKeyToText(hotkey.key).toUpperCase());
		return ' ' + parts.join(' ') + ' ';
	}

	const KEY_TO_TEXT: { [key: string]: string } = {
		ArrowDown: '↓',
		ArrowUp: '↑',
		ArrowRight: '→',
		ArrowLef: '←',
		' ': 'Space',
		// Enter: '↵',
	};

	export function convertKeyToText(key: string): string {
		if (Object.prototype.hasOwnProperty.call(KEY_TO_TEXT, key)) {
			return KEY_TO_TEXT[key] ?? key;
		}
		return key;
	}
</script>

<span class="setting-hotkey">
	{displayedText(hotkey)}
	<span
		class="icon-container"
		bind:this={iconContainerEl}
		on:click={onIconClicked}
	/>
</span>

<style>
	.icon-container {
		display: inline-block;
		cursor: pointer;
		width: 16px;
		height: 16px;
		border-radius: 10px;
		line-height: 16px;
		text-align: center;
	}

	.icon-container:hover {
		background-color: var(--background-modifier-error);
		color: var(--text-on-accent);
	}

	.setting-hotkey {
		/* font-family: var(--font-monospace); */
		font-size: 12px;
		background-color: var(--background-secondary-alt);
		border-radius: 4px;
		padding: 0 10px;
		min-height: 24px;
		align-self: flex-end;
		position: relative;
	}
</style>
