import { Component } from 'obsidian';
import { AvailableOutlineWidth } from 'Setting';

export class Outline extends Component {
	private readonly outlineEl: HTMLElement;

	constructor() {
		super();
		this.outlineEl = document.body.createEl('div', {
			cls: 'core-search-assistant_search-mode-outline',
		});
	}

	override onload(): void {
		this.outlineEl.hide();
	}

	override onunload(): void {
		this.outlineEl.remove();
	}

	show(lineWidth: AvailableOutlineWidth) {
		this.outlineEl.style.outline = `${lineWidth}px solid var(--interactive-accent)`;
		this.outlineEl.style.outlineOffset = `-${lineWidth}px`;
		this.outlineEl.show();
	}

	hide() {
		this.outlineEl.hide();
	}
}
