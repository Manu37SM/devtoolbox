// Manifest V3 service worker. Registers one context-menu item per curated
// tool, runs the matching transform against the page's current text
// selection, then injects a tiny result-display function into the page via
// chrome.scripting.executeScript.
//
// Why executeScript instead of a persistent content script + message
// passing: it keeps the extension's page footprint at zero until the user
// actually invokes it (no script runs on every page load), and it avoids
// clipboard-write permission ambiguity — the injected function only writes
// to the clipboard from an explicit in-page button click, which is a
// guaranteed user gesture in the tab's own context.
//
// No network calls anywhere in this file. The only inputs are the page's
// selected text and this extension's own pure transforms.ts; the only
// output is a DOM overlay injected into the current tab.

import { TOOLS, type ToolId } from "./transforms.ts";

const MENU_ROOT_ID = "devtoolbox-root";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ROOT_ID,
    title: "DevToolbox",
    contexts: ["selection"],
  });
  for (const tool of TOOLS) {
    chrome.contextMenus.create({
      id: tool.id,
      parentId: MENU_ROOT_ID,
      title: tool.label,
      contexts: ["selection"],
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selection = info.selectionText;
  if (!selection || !tab?.id) return;

  const tool = TOOLS.find((t) => t.id === (info.menuItemId as ToolId));
  if (!tool) return;

  const result = tool.run(selection);

  void chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: showDevToolboxOverlay,
    args: [tool.label, result.ok, result.output],
  });
});

// Injected into the page — must be a fully self-contained function with no
// closure references, per chrome.scripting.executeScript's `func` contract.
function showDevToolboxOverlay(title: string, ok: boolean, output: string): void {
  const existing = document.getElementById("devtoolbox-overlay");
  existing?.remove();

  const overlay = document.createElement("div");
  overlay.id = "devtoolbox-overlay";
  overlay.style.cssText = [
    "position:fixed",
    "top:16px",
    "right:16px",
    "z-index:2147483647",
    "max-width:420px",
    "max-height:60vh",
    "overflow:auto",
    "background:#1e1e1e",
    "color:#f0f0f0",
    "font:12px/1.4 ui-monospace,Consolas,monospace",
    "border-radius:8px",
    "box-shadow:0 4px 20px rgba(0,0,0,0.4)",
    "padding:12px",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px";

  const label = document.createElement("strong");
  label.textContent = `DevToolbox — ${title}`;
  label.style.cssText = "font-family:ui-sans-serif,system-ui,sans-serif;color:" + (ok ? "#6ee7b7" : "#fca5a5");

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "background:none;border:none;color:#f0f0f0;cursor:pointer;font-size:14px";
  closeBtn.addEventListener("click", () => overlay.remove());

  header.append(label, closeBtn);

  const pre = document.createElement("pre");
  pre.textContent = output;
  pre.style.cssText = "white-space:pre-wrap;word-break:break-word;margin:0 0 8px 0";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy to clipboard";
  copyBtn.style.cssText =
    "background:#2563eb;color:white;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font:12px ui-sans-serif,system-ui,sans-serif";
  copyBtn.addEventListener("click", () => {
    void navigator.clipboard.writeText(output).then(() => {
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy to clipboard"), 1500);
    });
  });

  overlay.append(header, pre, copyBtn);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 20000);
}
