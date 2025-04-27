import { type EventRef, Events } from "obsidian";

export const EVENT_SEARCH_RESULT_ITEM_DETECTED = "search-result-item-detected";
export const EVENT_SORT_ORDER_CHANGED = "sort-order-changed";

export class CoreSearchAssistantEvents extends Events {
	override trigger(name: typeof EVENT_SEARCH_RESULT_ITEM_DETECTED): void;
	override trigger(name: typeof EVENT_SORT_ORDER_CHANGED): void;
	override trigger(name: string, ...data: any[]): void {
		super.trigger(name, ...data);
	}

	override on(
		name: typeof EVENT_SEARCH_RESULT_ITEM_DETECTED,
		callback: () => any,
		ctx?: any,
	): EventRef;
	override on(
		name: typeof EVENT_SORT_ORDER_CHANGED,
		callback: () => any,
		ctx?: any,
	): EventRef;

	override on(
		name: string,
		callback: (...data: any[]) => any,
		ctx?: any,
	): EventRef {
		return super.on(name, callback, ctx);
	}
}
