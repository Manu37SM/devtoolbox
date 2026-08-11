"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

const RUN_TIMEOUT_MS = 3_000;

// The sandboxed runner document — loaded via `srcdoc` so it gets a unique,
// opaque per-frame origin automatically (no cookies, no localStorage, no
// access to the parent's origin at all), with no dedicated subdomain to
// deploy or maintain. `sandbox="allow-scripts"` only — no
// `allow-same-origin`, no `allow-forms`, no `allow-popups`,
// no `allow-top-navigation`. The CSP meta tag blocks all network egress
// (`connect-src 'none'`) as defense-in-depth on top of the WASM import
// allowlist a plugin is supposed to be validated against at submission
// time (ARCHITECTURE.md §16.1/§16.2).
//
// Minimal calling convention (v1, documented — not wasm-bindgen): the
// module must export `memory`, `alloc(len) -> ptr`, and
// `transform(ptr, len) -> resultPtr`, where the result is a 4-byte
// little-endian length prefix followed by UTF-8 bytes at `resultPtr`. This
// is deliberately hand-rolled and narrow — no options object is marshaled
// into the WASM call in v1 (ARCHITECTURE.md §16.5's open question on the
// permission/capability model applies here too; left unresolved rather
// than guessed at).
const SANDBOX_HTML = `<!doctype html>
<html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; img-src 'none'; style-src 'none'">
</head><body>
<script>
window.addEventListener("message", async function (ev) {
  var msg = ev.data;
  if (!msg || msg.type !== "run") return;
  try {
    var binary = atob(msg.wasmBase64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    var result = await WebAssembly.instantiate(bytes, {
      env: { abort: function () { throw new Error("plugin aborted"); } },
    });
    var exp = result.instance.exports;
    if (typeof exp.alloc !== "function" || typeof exp.transform !== "function" || !exp.memory) {
      throw new Error("Plugin module doesn't export the required alloc/transform/memory interface.");
    }
    var inputBytes = new TextEncoder().encode(msg.input);
    var inputPtr = exp.alloc(inputBytes.length);
    new Uint8Array(exp.memory.buffer, inputPtr, inputBytes.length).set(inputBytes);
    var resultPtr = exp.transform(inputPtr, inputBytes.length);
    var view = new DataView(exp.memory.buffer);
    var resultLen = view.getUint32(resultPtr, true);
    var resultBytes = new Uint8Array(exp.memory.buffer, resultPtr + 4, resultLen);
    var output = new TextDecoder().decode(resultBytes);
    parent.postMessage({ type: "result", output: output }, "*");
  } catch (err) {
    parent.postMessage({ type: "error", error: String((err && err.message) || err) }, "*");
  }
});
parent.postMessage({ type: "ready" }, "*");
</script>
</body></html>`;

interface PluginRunnerProps {
  slug: string;
  wasmBase64: string;
}

/** Runs a plugin's WASM module against user-entered text, entirely inside
 * an opaque-origin sandboxed iframe — see SANDBOX_HTML's comment above for
 * the security model. No network call anywhere in this component; the
 * plugin's own code has no network access either. */
export function PluginRunner({ slug, wasmBase64 }: PluginRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return; // ignore anything not from our own sandbox frame
      const data = ev.data as { type: string; output?: string; error?: string };
      if (data.type === "ready") {
        setReady(true);
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setRunning(false);
      if (data.type === "result") {
        setOutput(data.output ?? "");
        setError(null);
      } else if (data.type === "error") {
        setError(data.error ?? "Plugin execution failed.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function onRun() {
    if (!iframeRef.current?.contentWindow || !ready) return;
    setRunning(true);
    setError(null);
    iframeRef.current.contentWindow.postMessage({ type: "run", wasmBase64, input, options: {} }, "*");
    timeoutRef.current = setTimeout(() => {
      setRunning(false);
      setError(`Plugin didn't respond within ${RUN_TIMEOUT_MS / 1000}s — reloading the sandbox.`);
      // A hung/hostile plugin's frame is never reused — reload forces a
      // fresh WASM instance for the next run (ARCHITECTURE.md §16.1.3).
      if (iframeRef.current) iframeRef.current.srcdoc = SANDBOX_HTML;
      setReady(false);
    }, RUN_TIMEOUT_MS);
  }

  return (
    <div className="flex flex-col gap-3">
      <iframe
        ref={iframeRef}
        srcDoc={SANDBOX_HTML}
        sandbox="allow-scripts"
        className="hidden"
        title={`${slug} sandbox`}
      />
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Input</label>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste text here" />
          </div>
        }
        output={<OutputPane value={output} error={error} placeholder="Output appears here" />}
      />
      <Button size="sm" className="self-start" onClick={onRun} disabled={!ready || running}>
        {!ready ? "Loading sandbox…" : running ? "Running…" : "Run"}
      </Button>
    </div>
  );
}
