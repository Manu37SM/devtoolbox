"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { tsconfigGenerator } from "./transform";
import type { TsconfigGeneratorOptions } from "./schema";

type Options = TsconfigGeneratorOptions;

const defaultOptions: Options = {"preset": "node-app", "strictness": "strict", "target": "auto", "module": "auto", "outDir": "dist", "rootDir": "src", "pathAlias": "", "include": "src", "exclude": "node_modules, dist", "sourceMap": true, "declaration": false, "skipLibCheck": true, "esModuleInterop": true, "resolveJsonModule": false, "allowJs": false, "incremental": false, "isolatedModules": false, "comments": true} as Options;

export function TsconfigGeneratorToolView() {

  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => tsconfigGenerator("", options), [options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Preset"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.preset} onChange={(e) => setOptions((o) => ({ ...o, preset: e.target.value as Options["preset"] }))}>
            <option value={"node-app"}>{"Node.js app"}</option>
            <option value={"node-library"}>{"Node library (CommonJS)"}</option>
            <option value={"library-esm"}>{"Library (ESM + types)"}</option>
            <option value={"browser"}>{"Browser (bundler)"}</option>
            <option value={"react-vite"}>{"React + Vite"}</option>
            <option value={"nextjs"}>{"Next.js"}</option>
            <option value={"angular-like"}>{"Angular-style"}</option>
            <option value={"bun-deno-style"}>{"Bun / modern bundler"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Strictness"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.strictness} onChange={(e) => setOptions((o) => ({ ...o, strictness: e.target.value as Options["strictness"] }))}>
            <option value={"loose"}>{"Loose"}</option>
            <option value={"strict"}>{"Strict"}</option>
            <option value={"strictest"}>{"Strictest (extra checks)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Target"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.target} onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as Options["target"] }))}>
            <option value={"auto"}>{"From preset"}</option>
            <option value={"ES2017"}>{"ES2017"}</option>
            <option value={"ES2019"}>{"ES2019"}</option>
            <option value={"ES2020"}>{"ES2020"}</option>
            <option value={"ES2021"}>{"ES2021"}</option>
            <option value={"ES2022"}>{"ES2022"}</option>
            <option value={"ES2023"}>{"ES2023"}</option>
            <option value={"ESNext"}>{"ESNext"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Module"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.module} onChange={(e) => setOptions((o) => ({ ...o, module: e.target.value as Options["module"] }))}>
            <option value={"auto"}>{"From preset"}</option>
            <option value={"ESNext"}>{"ESNext"}</option>
            <option value={"NodeNext"}>{"NodeNext"}</option>
            <option value={"CommonJS"}>{"CommonJS"}</option>
            <option value={"Preserve"}>{"Preserve"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"outDir"}
          <input type="text" value={options.outDir} placeholder={"dist"} onChange={(e) => setOptions((o) => ({ ...o, outDir: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"rootDir"}
          <input type="text" value={options.rootDir} placeholder={"src"} onChange={(e) => setOptions((o) => ({ ...o, rootDir: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Path alias"}
          <input type="text" value={options.pathAlias} placeholder={"@/*"} onChange={(e) => setOptions((o) => ({ ...o, pathAlias: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"include"}
          <input type="text" value={options.include} placeholder={"src"} onChange={(e) => setOptions((o) => ({ ...o, include: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"exclude"}
          <input type="text" value={options.exclude} placeholder={"node_modules, dist"} onChange={(e) => setOptions((o) => ({ ...o, exclude: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sourceMap} onChange={(e) => setOptions((o) => ({ ...o, sourceMap: e.target.checked }))} />
          {"Source maps"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.declaration} onChange={(e) => setOptions((o) => ({ ...o, declaration: e.target.checked }))} />
          {"Declarations"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.skipLibCheck} onChange={(e) => setOptions((o) => ({ ...o, skipLibCheck: e.target.checked }))} />
          {"skipLibCheck"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.esModuleInterop} onChange={(e) => setOptions((o) => ({ ...o, esModuleInterop: e.target.checked }))} />
          {"esModuleInterop"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.resolveJsonModule} onChange={(e) => setOptions((o) => ({ ...o, resolveJsonModule: e.target.checked }))} />
          {"Import JSON"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowJs} onChange={(e) => setOptions((o) => ({ ...o, allowJs: e.target.checked }))} />
          {"Allow JS"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.incremental} onChange={(e) => setOptions((o) => ({ ...o, incremental: e.target.checked }))} />
          {"Incremental"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.isolatedModules} onChange={(e) => setOptions((o) => ({ ...o, isolatedModules: e.target.checked }))} />
          {"isolatedModules"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.comments} onChange={(e) => setOptions((o) => ({ ...o, comments: e.target.checked }))} />
          {"Explain with comments"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label={"tsconfig.json"} fileName={"tsconfig.json"} value={result.output} error={result.error?.message ?? null} placeholder={""} />
      </div>
    </div>
  );
}
