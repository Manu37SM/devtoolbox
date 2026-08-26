"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

const RUN_TIMEOUT_MS = 3_000;

const WORKER_SRC = `
self.onmessage = async function (ev) {
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
    self.postMessage({ type: "result", output: output });
  } catch (err) {
    self.postMessage({ type: "error", error: String((err && err.message) || err) });
  }
};
`;

const SANDBOX_HTML = `<!doctype html>
<html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; img-src 'none'; style-src 'none'; worker-src blob:; child-src blob:">
</head><body>
<script>
var WORKER_SRC = ${JSON.stringify(WORKER_SRC)};
var worker = null;

function spawnWorker() {
  if (worker) worker.terminate();
  var blob = new Blob([WORKER_SRC], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = function (ev) {
    parent.postMessage(ev.data, "*");
  };
  worker.onerror = function (ev) {
    parent.postMessage({ type: "error", error: String(ev.message || "Worker crashed.") }, "*");
  };
}

window.addEventListener("message", function (ev) {
  var msg = ev.data;
  if (!msg) return;
  if (msg.type === "run") {
    spawnWorker(); // always a fresh worker — never reuse one that may have hung on a prior run
    worker.postMessage({ type: "run", wasmBase64: msg.wasmBase64, input: msg.input });
  } else if (msg.type === "cancel") {
    if (worker) worker.terminate(); // forcible stop — works even mid-infinite-loop
    worker = null;
  }
});
parent.postMessage({ type: "ready" }, "*");
</script>
</body></html>`;

interface PluginRunnerProps {
  slug: string;
  wasmBase64: string;
}

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
      if (ev.source !== iframeRef.current?.contentWindow) return;
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
      setError(`Plugin didn't respond within ${RUN_TIMEOUT_MS / 1000}s — cancelled.`);

      iframeRef.current?.contentWindow?.postMessage({ type: "cancel" }, "*");
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
