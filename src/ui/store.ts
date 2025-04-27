import type CoreSearchAssistantPlugin from "main";
import type { App } from "obsidian";
import { writable } from "svelte/store";

export const app = writable<App>();
export const plugin = writable<CoreSearchAssistantPlugin>();
