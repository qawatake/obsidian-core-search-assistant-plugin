<script lang="ts">
import { type Hotkey, setIcon } from "obsidian";
import { createEventDispatcher, onMount } from "svelte";
import { convertHotkeyToText } from "utils/Keymap";

// props
export let hotkey: Hotkey;

// binds
let iconContainerEl: HTMLSpanElement | undefined;

// internal variables
const dispatcher = createEventDispatcher();

onMount(() => {
	if (iconContainerEl instanceof HTMLSpanElement) {
		setIcon(iconContainerEl, "cross", 8);
	}
});

function onIconClicked() {
	dispatcher("removed");
}
</script>

<span class="setting-hotkey">
	{convertHotkeyToText(hotkey)}
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
