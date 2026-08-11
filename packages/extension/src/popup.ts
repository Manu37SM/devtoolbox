// Toolbar popup — a quick version of the same curated tools available from
// the context menu, for when there's no page selection to right-click (e.g.
// pasting from another app). Runs entirely in the popup's own DOM; no
// messaging to background/content needed since transforms.ts is pure and
// side-effect-free.

import { TOOLS } from "./transforms.ts";

const toolSelect = document.getElementById("tool") as HTMLSelectElement;
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLPreElement;
const runBtn = document.getElementById("run") as HTMLButtonElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;

for (const tool of TOOLS) {
  const option = document.createElement("option");
  option.value = tool.id;
  option.textContent = tool.label;
  toolSelect.appendChild(option);
}

function run(): void {
  const tool = TOOLS.find((t) => t.id === toolSelect.value);
  if (!tool) return;
  const result = tool.run(input.value);
  output.textContent = result.output;
  output.style.color = result.ok ? "#1e1e1e" : "#b91c1c";
}

runBtn.addEventListener("click", run);

copyBtn.addEventListener("click", () => {
  if (!output.textContent) return;
  void navigator.clipboard.writeText(output.textContent).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy result"), 1500);
  });
});
