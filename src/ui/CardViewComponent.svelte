<script lang="ts">
	import type { TFile } from 'obsidian';

	import { type AvailableCardLayout, parseCardLayout } from 'Setting';

	import { createEventDispatcher, onDestroy } from 'svelte';
	import CardContainer from './CardContainer.svelte';

	// props
	export let layout: AvailableCardLayout;
	export let focusEl: HTMLInputElement | undefined;

	// binds
	let contentEl: HTMLElement | undefined;

	// internal variables
	// let selected: number;
	let cards: CardContainer[] = [];
	$: cardViewLayout = parseCardLayout(layout);

	// event dispatcher
	const dispatcher = createEventDispatcher();

	export function addCard(file: TFile) {
		if (!contentEl) return;
		if (!focusEl) return;
		if (cards.length >= cardsPerPage(layout)) return;
		const card = new CardContainer({
			target: contentEl,
			props: {
				file: file,
				id: cards.length,
				selected: false,
				focusEl: focusEl,
			},
		});
		cards.push(card);
	}

	export function renderPage(files: TFile[]) {
		files.forEach((file) => {
			addCard(file);
		});
	}

	// you don't have to translate id into position in card view
	export function focusOn(id: number) {
		const pos = id % cardsPerPage(layout); // id in results => position in cards
		[-1, 0, 1].forEach((i) => {
			const card = cards[pos + i];
			if (!card) return;
			if (i == 0) {
				card.$set({ selected: true });
			} else {
				card.$set({ selected: false });
			}
		});
	}

	export function detachCards() {
		cards.forEach((card) => {
			card.$destroy();
		});
		cards = [];
	}

	export function checkCardsRenderedCorrectly(files: TFile[]): boolean {
		for (let i = 0; i < cardsPerPage(layout); i++) {
			const file = files[i];
			const card = cards[i];
			if (file?.path !== card?.path()) {
				console.log(file?.path, card?.path());
				return false;
			}
		}
		return true;
	}

	onDestroy(() => {
		detachCards();
	});

	function cardsPerPage(layout: AvailableCardLayout): number {
		const [row, column] = parseCardLayout(layout);
		return row * column;
	}
</script>

<div class="card-view-container">
	<div
		class="card-view-background"
		on:click={() => {
			dispatcher('should-destroy');
		}}
	/>
	<div
		class="cards-container"
		bind:this={contentEl}
		style={`grid-template-columns: repeat(${cardViewLayout[1]}, minmax(0, 1fr)); grid-template-rows: repeat(${cardViewLayout[0]}, 1fr);`}
	/>
</div>

<style>
	.card-view-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: var(--layer-modal);
		padding: 20px 30px;
		display: flex;
		justify-content: center;
	}

	.card-view-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: var(--background-modifier-cover);
	}

	.cards-container {
		display: grid;
		/* grid-template-columns: repeat(5, minmax(0, 1fr)); */
		/* grid-template-rows: repeat(attr(data-row), 1fr); */
		/* grid-template-rows: repeat(2, 1fr); */
		grid-gap: 20px;
		height: 100%;
		width: 100%;
		min-height: 0;
		/* z-index: 1; to put this in front of background */
	}
</style>
