import { type Hotkey, type Modifier, Platform } from "obsidian";

/**
 * key: code
 * value: key (https://developer.mozilla.org/ja/docs/Web/API/KeyboardEvent/code)
 */
const CODE_KEY_MAP: { [keyCode: string]: string } = {
	Semicolon: ";",
	Quote: "'",
	Comma: ",",
	Period: ".",
	Slash: "/",
	BracketLeft: "[",
	BracketRight: "]",
	BackSlash: "\\",
	Backquote: "`",
	Space: " ",
	Minus: "-",
	Equal: "=",
};
for (let i = 0; i < 10; i++) {
	CODE_KEY_MAP[`Digit${i}`] = i.toString();
}
for (let i = 65; i < 91; i++) {
	const char = String.fromCharCode(i);
	const upChar = char.toUpperCase();
	CODE_KEY_MAP[`Key${upChar}`] = char;
}

export function convertCodeToKey(code: string): string {
	return CODE_KEY_MAP[code] ?? code;
}

export function convertKeyToText(key: string): string {
	switch (key) {
		case "ArrowLeft":
			return "←";
		case "ArrowRight":
			return "→";
		case "ArrowUp":
			return "↑";
		case "ArrowDown":
			return "↓";
		case "Mod":
			return Platform.isMacOS ? "⌘" : "Ctrl";
		case "Ctrl":
			return Platform.isMacOS ? "⌃" : "Ctrl";
		case "Meta":
			return Platform.isMacOS ? "⌘" : "Win";
		case "Alt":
			return Platform.isMacOS ? "⌥" : "Alt";
		case "Shift":
			return Platform.isMacOS ? "⇧" : "Shift";
		case " ":
			return "Space";
		case "Enter":
			return "↵";
		default:
			return key.charAt(0).toUpperCase() + key.slice(1);
	}
}

export function convertHotkeyToText(hotkey: Hotkey) {
	const parts: string[] = [];
	hotkey.modifiers.forEach((mod) => {
		parts.push(convertKeyToText(mod));
	});
	const modifierPart = parts.join(" ");
	const keyPart = convertKeyToText(hotkey.key);
	return ` ${modifierPart} ${keyPart} `;
}

// the result does not contain 'Mod'
function compileModifiers(modifiers: Modifier[]): string {
	return modifiers
		.map((modifier) => {
			return "Mod" === modifier
				? Platform.isMacOS
					? "Meta"
					: "Ctrl"
				: modifier;
		})
		.sort()
		.join(",");
}

// Mod has a higher priority than 'Meta' or 'Ctrl'
export function decompileModifiers(modifiersId: string): Modifier[] {
	const modifiers: Modifier[] = [];
	const parts = modifiersId.split(",");
	parts.forEach((s) => {
		if (
			(Platform.isMacOS && s === "Meta") ||
			(!Platform.isMacOS && s === "Ctrl")
		) {
			modifiers.push("Mod");
			return;
		}
		if (s === "Alt" || s === "Shift" || s === "Meta" || s === "Ctrl") {
			modifiers.push(s);
			return;
		}
	});
	return modifiers;
}

function getModifiers(evt: KeyboardEvent): string {
	const modifiers: Modifier[] = [];
	evt.ctrlKey && modifiers.push("Ctrl");
	evt.metaKey && modifiers.push("Meta");
	evt.altKey && modifiers.push("Alt");
	evt.shiftKey && modifiers.push("Shift");
	return compileModifiers(modifiers);
}

export function getHotkey(evt: KeyboardEvent): Hotkey {
	const modifiers = decompileModifiers(getModifiers(evt));
	const key = convertCodeToKey(evt.code);
	return {
		modifiers,
		key,
	};
}

export function contain(hotkeys: Hotkey[], hotkey: Hotkey): boolean {
	const hotkeyId = convertHotkeyToText(hotkey);
	return hotkeys.some((key) => {
		return hotkeyId === convertHotkeyToText(key);
	});
}
