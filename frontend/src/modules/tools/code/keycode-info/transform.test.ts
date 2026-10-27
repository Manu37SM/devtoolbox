import { describe, expect, it } from "vitest";
import { describeKeyEvent, type KeyEventInfo } from "./transform";

const base: KeyEventInfo = { key: "a", code: "KeyA", keyCode: 65, location: 0, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, repeat: false };

describe("describeKeyEvent", () => {
  it("describes a plain key", () => {
    expect(describeKeyEvent(base)).toMatchObject({ key: "a", code: "KeyA", keyCode: 65, location: "Standard", modifiers: "none" });
  });
  it("lists modifiers and includes them in the snippet", () => {
    const d = describeKeyEvent({ ...base, key: "s", ctrlKey: true, shiftKey: true });
    expect(d.modifiers).toBe("Ctrl + Shift");
    expect(d.snippet).toBe('if (event.key === "s" && event.ctrlKey && event.shiftKey) {\n  // …\n}');
  });
  it("labels space and numpad locations", () => {
    expect(describeKeyEvent({ ...base, key: " ", code: "Space", keyCode: 32 }).key).toContain("Space");
    expect(describeKeyEvent({ ...base, location: 3 }).location).toBe("Numpad");
    expect(describeKeyEvent({ ...base, location: 9 }).location).toBe("9");
  });
  it("JSON-escapes odd keys in the snippet", () => {
    expect(describeKeyEvent({ ...base, key: '"' }).snippet).toContain('event.key === "\\""');
  });
});
