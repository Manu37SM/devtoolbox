export interface KeyEventInfo {
  key: string;
  code: string;
  keyCode: number;
  location: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
}

const LOCATIONS = ["Standard", "Left", "Right", "Numpad"];

export interface KeyDescription {
  key: string;
  code: string;
  keyCode: number;
  location: string;
  modifiers: string;
  snippet: string;
}

export function describeKeyEvent(e: KeyEventInfo): KeyDescription {
  const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Meta"].filter(Boolean) as string[];
  const shown = e.key === " " ? "␣ (Space)" : e.key;
  const conditions = [`event.key === ${JSON.stringify(e.key)}`];
  if (e.ctrlKey) conditions.push("event.ctrlKey");
  if (e.altKey) conditions.push("event.altKey");
  if (e.shiftKey) conditions.push("event.shiftKey");
  if (e.metaKey) conditions.push("event.metaKey");
  return {
    key: shown,
    code: e.code,
    keyCode: e.keyCode,
    location: LOCATIONS[e.location] ?? String(e.location),
    modifiers: mods.length ? mods.join(" + ") : "none",
    snippet: `if (${conditions.join(" && ")}) {\n  // …\n}`,
  };
}
