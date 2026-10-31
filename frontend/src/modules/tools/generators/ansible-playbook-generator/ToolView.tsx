"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { ansiblePlaybookGenerator } from "./transform";
import type { AnsiblePlaybookGeneratorOptions } from "./schema";

type Options = AnsiblePlaybookGeneratorOptions;

const defaultOptions: Options = {"playName": "Configure servers", "hosts": "all", "become": true, "gatherFacts": true, "packageModule": "package", "updateCache": true, "fqcn": true, "autoTags": false, "vars": "", "describeTasks": true} as Options;

export function AnsiblePlaybookGeneratorToolView() {
  const [in0, setIn0] = useState("package nginx git curl\nservice nginx started enabled\ntemplate nginx.conf.j2 /etc/nginx/nginx.conf mode=0644 notify=\"restart nginx\"\nfile /var/www/app state=directory mode=0755 owner=www-data\nuser deploy shell=/bin/bash groups=sudo");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => ansiblePlaybookGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Play name"}
          <input type="text" value={options.playName} placeholder={"Configure servers"} onChange={(e) => setOptions((o) => ({ ...o, playName: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Hosts"}
          <input type="text" value={options.hosts} placeholder={"all or webservers"} onChange={(e) => setOptions((o) => ({ ...o, hosts: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Play vars"}
          <input type="text" value={options.vars} placeholder={"app_port=8080, env=prod"} onChange={(e) => setOptions((o) => ({ ...o, vars: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Package module"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.packageModule} onChange={(e) => setOptions((o) => ({ ...o, packageModule: e.target.value as Options["packageModule"] }))}>
            <option value={"package"}>{"package (generic)"}</option>
            <option value={"apt"}>{"apt (Debian/Ubuntu)"}</option>
            <option value={"dnf"}>{"dnf (RHEL/Fedora)"}</option>
            <option value={"yum"}>{"yum (older RHEL)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.become} onChange={(e) => setOptions((o) => ({ ...o, become: e.target.checked }))} />
          {"become (sudo)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.gatherFacts} onChange={(e) => setOptions((o) => ({ ...o, gatherFacts: e.target.checked }))} />
          {"Gather facts"}
        </label>
        {["apt"].includes(String(options.packageModule)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.updateCache} onChange={(e) => setOptions((o) => ({ ...o, updateCache: e.target.checked }))} />
          {"apt update_cache"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.fqcn} onChange={(e) => setOptions((o) => ({ ...o, fqcn: e.target.checked }))} />
          {"ansible.builtin.* names"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.autoTags} onChange={(e) => setOptions((o) => ({ ...o, autoTags: e.target.checked }))} />
          {"Tag tasks"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.describeTasks} onChange={(e) => setOptions((o) => ({ ...o, describeTasks: e.target.checked }))} />
          {"Descriptive task names"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Tasks (one per line): package, service, copy, template, file, user, group, lineinfile, cron, git, get_url, unarchive, apt_repo, command, shell, hostname, wait_for, debug, reboot"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"package nginx git\nservice nginx started enabled\ntemplate nginx.conf.j2 /etc/nginx/nginx.conf mode=0644 notify=\"restart nginx\"\nuser deploy shell=/bin/bash groups=sudo"}
                  aria-label={"Tasks (one per line): package, service, copy, template, file, user, group, lineinfile, cron, git, get_url, unarchive, apt_repo, command, shell, hostname, wait_for, debug, reboot"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"playbook.yml"} fileName={"playbook.yml"} value={result.output} error={result.error?.message ?? null} placeholder={"Add a task such as: package nginx"} />}
        />
      </div>
    </div>
  );
}
