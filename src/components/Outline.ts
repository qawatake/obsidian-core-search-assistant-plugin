import { Component } from 'obsidian';
import { AvailableOutlineWidth } from 'Setting';

export class Outline extends Component {
	private readonly outlineEl: HTMLElement;
	private readonly lineWidth: AvailableOutlineWidth;

	constructor(lineWidth: AvailableOutlineWidth) {
		super();
		this.outlineEl = document.body.createEl('div', {
			cls: 'core-search-assistant_search-mode-outline',
		});
		this.lineWidth = lineWidth;
	}

	override onload(): void {
		this.setWidth(this.lineWidth);
	}

	override onunload(): void {
		this.outlineEl.remove();
	}

	setWidth(lineWidth: AvailableOutlineWidth) {
		this.outlineEl.style.outline = `${lineWidth}px solid var(--interactive-accent)`;
		this.outlineEl.style.outlineOffset = `-${lineWidth}px`;
		this.outlineEl.show();
	}
}
