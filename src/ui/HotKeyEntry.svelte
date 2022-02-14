<script lang="ts">
	import { ExtraButtonComponent, setIcon, type Hotkey } from 'obsidian';
	import { createEventDispatcher, onMount } from 'svelte';
	import HotkeySetting from './HotkeySetting.svelte';

	// props
	export let actionName: string | undefined;
	export let hotkeys: Hotkey[] | undefined;
	export let listening = false;

	// binds
	let restoreButtonEl: HTMLElement | undefined;
	let addHotkeyButtonEl: HTMLElement | undefined;

	// internal variables
	const dispatcher = createEventDispatcher();
	$: _hotkeys = [...(hotkeys ?? [])];
	$: _listening = listening;

	onMount(() => {
		if (restoreButtonEl) {
			const component = new ExtraButtonComponent(
				restoreButtonEl
			).setTooltip('Restore default');
			setIcon(component.extraSettingsEl, 'reset', ICON_SIZE);
		}
		if (addHotkeyButtonEl) {
			// setIcon(addHotkeyButtonEl, 'any-key', ICON_SIZE);
			const component = new ExtraButtonComponent(
				addHotkeyButtonEl
			).setTooltip('Customize this action');
			setIcon(component.extraSettingsEl, 'any-key', ICON_SIZE);
		}
	});

	const ICON_SIZE = 22;
</script>

<div class="item-container">
	<div class="info-container">{actionName}</div>
	<div class="control-container">
		<div class="hotkeys-container">
			{#each _hotkeys ?? [] as hotkey}
				<HotkeySetting
					on:removed={() => {
						dispatcher('removed', {
							removed: hotkey,
						});
					}}
					{hotkey}
				/>
			{/each}
			{#if _listening}
				<div class="setting-hotkey">Press hotkey...</div>
			{/if}
		</div>
		<span
			class="icon-container"
			bind:this={restoreButtonEl}
			on:click={() => {
				dispatcher('restored');
			}}
		/>
		<span
			class="icon-container"
			bind:this={addHotkeyButtonEl}
			on:click={() => {
				dispatcher('start-listening-keys');
			}}
		/>
	</div>
</div>

<style>
	.item-container {
		display: flex;
		align-items: center;
		padding: 18px 0 18px 0;
		border-top: 1px solid var(--background-modifier-border);
	}

	.info-container {
		flex: 1 1 auto;
		flex-grow: 1;
		margin-right: 20px;
	}

	.control-container {
		flex: 1 1 auto;
		text-align: right;
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.hotkeys-container {
		display: flex;
		flex-direction: column;
		margin-right: 6px;
	}

	.setting-hotkey {
		font-size: 12px;
		background-color: var(--interactive-accent);
		border-radius: 4px;
		padding: 0 10px;
		min-height: 24px;
		align-self: flex-end;
		position: relative;
		color: var(--text-on-accent);
	}

	.icon-container {
		/* line-height: 0;
		color: var(--text-muted);
		cursor: pointer;
		margin: 0 10px; */
		padding: 4px 6px;
		border-radius: 4px;
		color: var(--text-faint);
		cursor: pointer;
		height: 26px;
	}

	.icon-container:hover {
		background-color: var(--background-secondary-alt);
		color: var(--text-normal);
	}

	/* reset default obsidian styles */
	.icon-container :global(.clickable-icon) {
		color: unset;
		cursor: unset;
		margin: unset;
	}
	.icon-container :global(.setting-editor-extra-setting-button) {
		line-height: 0;
	}
	.icon-container :global(.clickable-icon svg) {
		position: relative;
		bottom: 2px;
	}
</style>
