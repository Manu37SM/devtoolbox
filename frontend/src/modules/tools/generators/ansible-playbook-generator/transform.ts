import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { AnsiblePlaybookGeneratorOptions } from "./schema";

type Params = Record<string, unknown>;
interface Task { name: string; module: string; params: Params | string; extra: Record<string, unknown>; tag: string }

const INT_KEYS = new Set(["port", "timeout", "gid", "uid", "delay", "retries", "sleep"]);
const BOOL = /^(yes|true|on)$/i;
const NBOOL = /^(no|false|off)$/i;

/** Split on whitespace, honouring "double" and 'single' quotes; quotes may sit inside key=value. */
export function shellSplit(s: string): string[] | null {
  const out: string[] = [];
  let cur = "", q = "", has = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) {
      if (c === q) q = "";
      else if (c === "\\" && q === '"' && i + 1 < s.length) cur += s[++i];
      else cur += c;
    } else if (c === '"' || c === "'") { q = c; has = true; }
    else if (/\s/.test(c)) { if (cur || has) out.push(cur); cur = ""; has = false; }
    else cur += c;
  }
  if (q) return null;
  if (cur || has) out.push(cur);
  return out;
}

function coerce(key: string, v: string): unknown {
  if (BOOL.test(v)) return true;
  if (NBOOL.test(v)) return false;
  if (INT_KEYS.has(key) && /^\d+$/.test(v)) return Number(v);
  return v;
}

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function ansiblePlaybookGenerator(input: string, options: Partial<AnsiblePlaybookGeneratorOptions> = {}): TransformResult {
  const o: AnsiblePlaybookGeneratorOptions = {
    playName: options.playName ?? "Configure servers", hosts: options.hosts ?? "all", become: options.become ?? true, gatherFacts: options.gatherFacts ?? true,
    packageModule: options.packageModule ?? "package", updateCache: options.updateCache ?? true, fqcn: options.fqcn ?? true, autoTags: options.autoTags ?? false,
    vars: options.vars ?? "", describeTasks: options.describeTasks ?? true,
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  if (!/^[A-Za-z0-9_.:,\[\]!&-]+$/.test(o.hosts)) return fail("Hosts must be a group, host or pattern such as webservers or web*:!staging.");
  const mod = (m: string) => (o.fqcn ? `ansible.builtin.${m}` : m);

  const playVars: Params = {};
  for (const part of o.vars.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(part);
    if (!m) return fail(`Variable "${part}" must look like name=value.`);
    playVars[m[1]!] = /^\d+$/.test(m[2]!) ? Number(m[2]) : BOOL.test(m[2]!) ? true : NBOOL.test(m[2]!) ? false : m[2];
  }

  const tasks: Task[] = [];
  const handlers = new Map<string, { name: string; module: string; params: Params }>();

  for (const [n, line] of lines.entries()) {
    const at = `Line ${n + 1}`;
    const tokens = shellSplit(line);
    if (!tokens || !tokens.length) return fail(`${at}: unbalanced quote.`);
    const verb = tokens[0]!.toLowerCase();
    const pos: string[] = [];
    const kv: Record<string, string> = {};
    for (const t of tokens.slice(1)) {
      const m = /^([a-z_][a-z0-9_]*)=([\s\S]*)$/.exec(t);
      if (m && !(verb === "command" || verb === "shell") ) kv[m[1]!] = m[2]!;
      else if (m && (verb === "command" || verb === "shell") && ["creates", "removes", "chdir", "name"].includes(m[1]!)) kv[m[1]!] = m[2]!;
      else pos.push(t);
    }
    const take = (...keys: string[]) => { const p: Params = {}; for (const k of keys) if (k in kv) { p[k] = coerce(k, kv[k]!); delete kv[k]; } return p; };
    const need = (cond: unknown, what: string) => (cond ? null : fail(`${at}: "${verb}" needs ${what}.`));
    let t: Omit<Task, "extra"> & { extra?: Record<string, unknown> };
    const customName = kv.name; delete kv.name;
    const nm = (generic: string, specific: string) => customName ?? (o.describeTasks ? specific : generic);

    switch (verb) {
      case "package": case "install": case "remove": case "upgrade": {
        const e = need(pos.length, "at least one package name"); if (e) return e;
        const state = verb === "remove" ? "absent" : verb === "upgrade" ? "latest" : (kv.state ?? "present"); delete kv.state;
        const m = o.packageModule;
        const p: Params = { name: pos.length === 1 ? pos[0] : pos, state };
        if (m === "apt" && o.updateCache) { p.update_cache = true; p.cache_valid_time = 3600; }
        t = { name: nm("Manage packages", `${verb === "remove" ? "Remove" : "Install"} ${pos.join(", ")}`), module: mod(m), params: p, tag: "packages" };
        break;
      }
      case "service": case "systemd": {
        const e = need(pos[0], "a service name"); if (e) return e;
        const p: Params = { name: pos[0] };
        for (const w of pos.slice(1)) {
          if (["started", "stopped", "restarted", "reloaded"].includes(w)) p.state = w;
          else if (w === "enabled") p.enabled = true;
          else if (w === "disabled") p.enabled = false;
          else return fail(`${at}: "${w}" is not started/stopped/restarted/reloaded/enabled/disabled.`);
        }
        Object.assign(p, take("state", "enabled", "daemon_reload"));
        if (!p.state && p.enabled === undefined) p.state = "started";
        t = { name: nm("Manage service", `Manage service ${pos[0]}`), module: mod(verb), params: p, tag: "services" };
        break;
      }
      case "copy": {
        const p: Params = { ...(pos[0] ? { src: pos[0] } : {}), ...(pos[1] ? { dest: pos[1] } : {}), ...take("src", "dest", "content", "mode", "owner", "group", "backup", "remote_src") };
        const e = need(p.dest && (p.src || p.content), "a destination and a source (or content=)"); if (e) return e;
        t = { name: nm("Copy file", `Copy ${p.src ?? "content"} to ${p.dest}`), module: mod("copy"), params: p, tag: "files" };
        break;
      }
      case "template": {
        const p: Params = { ...(pos[0] ? { src: pos[0] } : {}), ...(pos[1] ? { dest: pos[1] } : {}), ...take("src", "dest", "mode", "owner", "group", "backup", "validate") };
        const e = need(p.src && p.dest, "a template and a destination"); if (e) return e;
        t = { name: nm("Render template", `Render ${p.src} to ${p.dest}`), module: mod("template"), params: p, tag: "files" };
        break;
      }
      case "file": {
        const p: Params = { ...(pos[0] ? { path: pos[0] } : {}), ...take("path", "state", "mode", "owner", "group", "src", "recurse") };
        const e = need(p.path, "a path"); if (e) return e;
        if (!p.state) p.state = "directory";
        t = { name: nm("Manage file", `Ensure ${p.path} is ${p.state}`), module: mod("file"), params: p, tag: "files" };
        break;
      }
      case "user": {
        const e = need(pos[0], "a user name"); if (e) return e;
        const p: Params = { name: pos[0], state: "present", ...take("shell", "groups", "append", "password_lock", "create_home", "system", "uid", "home", "comment") };
        if (p.groups && p.append === undefined) p.append = true;
        t = { name: nm("Manage user", `Ensure user ${pos[0]}`), module: mod("user"), params: p, tag: "users" };
        break;
      }
      case "group": {
        const e = need(pos[0], "a group name"); if (e) return e;
        t = { name: nm("Manage group", `Ensure group ${pos[0]}`), module: mod("group"), params: { name: pos[0], state: "present", ...take("gid", "system") }, tag: "users" };
        break;
      }
      case "lineinfile": {
        const p: Params = { ...(pos[0] ? { path: pos[0] } : {}), ...take("path", "regexp", "line", "state", "create", "backup", "insertafter") };
        const e = need(p.path && (p.line || p.regexp), "a path and line= or regexp="); if (e) return e;
        t = { name: nm("Edit line in file", `Set a line in ${p.path}`), module: mod("lineinfile"), params: p, tag: "files" };
        break;
      }
      case "cron": {
        const p: Params = { ...(pos[0] ? { name: pos[0] } : {}), ...take("name", "minute", "hour", "day", "month", "weekday", "job", "user", "state") };
        const e = need(p.name && p.job, "a job name and job=…"); if (e) return e;
        t = { name: nm("Manage cron job", `Cron job: ${p.name}`), module: mod("cron"), params: p, tag: "cron" };
        break;
      }
      case "git": {
        const p: Params = take("repo", "dest", "version", "update", "force");
        const e = need(p.repo && p.dest, "repo= and dest="); if (e) return e;
        t = { name: nm("Clone repository", `Clone ${p.repo}`), module: mod("git"), params: p, tag: "deploy" };
        break;
      }
      case "get_url": {
        const p: Params = { ...(pos[0] ? { url: pos[0] } : {}), ...(pos[1] ? { dest: pos[1] } : {}), ...take("url", "dest", "mode", "checksum", "owner", "group") };
        const e = need(p.url && p.dest, "a URL and a destination"); if (e) return e;
        t = { name: nm("Download file", `Download ${p.url}`), module: mod("get_url"), params: p, tag: "files" };
        break;
      }
      case "unarchive": {
        const p: Params = { ...(pos[0] ? { src: pos[0] } : {}), ...(pos[1] ? { dest: pos[1] } : {}), ...take("src", "dest", "remote_src", "mode", "owner", "group", "creates") };
        const e = need(p.src && p.dest, "a source archive and a destination"); if (e) return e;
        t = { name: nm("Unpack archive", `Unpack ${p.src}`), module: mod("unarchive"), params: p, tag: "files" };
        break;
      }
      case "apt_repo": case "deb822_repository": {
        const p: Params = { ...(pos[0] ? { name: pos[0] } : {}), ...take("name", "uris", "suites", "components", "signed_by", "types", "state") };
        const e = need(p.name && p.uris && p.suites, "a name, uris= and suites="); if (e) return e;
        for (const k of ["uris", "suites", "components", "types"]) if (typeof p[k] === "string") p[k] = list(p[k] as string);
        t = { name: nm("Add apt repository", `Add apt repository ${p.name}`), module: mod("deb822_repository"), params: { state: "present", ...p }, tag: "packages" };
        break;
      }
      case "command": case "shell": {
        const cmd = pos.join(" ");
        const e = need(cmd, "a command"); if (e) return e;
        t = { name: nm("Run command", `Run: ${cmd.length > 40 ? cmd.slice(0, 37) + "…" : cmd}`), module: mod(verb), params: { cmd, ...take("creates", "removes", "chdir") }, tag: "commands" };
        break;
      }
      case "hostname": {
        const e = need(pos[0], "a host name"); if (e) return e;
        t = { name: nm("Set hostname", `Set hostname to ${pos[0]}`), module: mod("hostname"), params: { name: pos[0] }, tag: "system" };
        break;
      }
      case "wait_for": {
        const p: Params = take("host", "port", "timeout", "state", "path", "delay");
        const e = need(p.port || p.path, "port= or path="); if (e) return e;
        t = { name: nm("Wait for condition", `Wait for ${p.port ? "port " + p.port : p.path}`), module: mod("wait_for"), params: p, tag: "system" };
        break;
      }
      case "debug": {
        const e = need(pos.length, "a message"); if (e) return e;
        t = { name: nm("Show message", "Show message"), module: mod("debug"), params: { msg: pos.join(" ") }, tag: "debug" };
        break;
      }
      case "reboot": {
        t = { name: nm("Reboot", "Reboot the machine"), module: mod("reboot"), params: take("reboot_timeout", "msg"), tag: "system" };
        break;
      }
      default:
        return fail(`${at}: unknown task "${verb}". Use package, install, remove, upgrade, service, systemd, copy, template, file, user, group, lineinfile, cron, git, get_url, unarchive, apt_repo, command, shell, hostname, wait_for, debug or reboot.`);
    }

    const extra: Record<string, unknown> = {};
    if (kv.when) { extra.when = kv.when; delete kv.when; }
    if (kv.register) { extra.register = kv.register; delete kv.register; }
    if (kv.become !== undefined) { extra.become = coerce("become", kv.become); delete kv.become; }
    if (kv.become_user) { extra.become_user = kv.become_user; delete kv.become_user; }
    if (kv.ignore_errors !== undefined) { extra.ignore_errors = coerce("x", kv.ignore_errors); delete kv.ignore_errors; }
    if (kv.loop) { extra.loop = list(kv.loop); delete kv.loop; }
    if (kv.tags) { extra.tags = list(kv.tags); delete kv.tags; }
    if (kv.notify) {
      const m = /^(restart|reload|start|stop)\s+(\S+)$/.exec(kv.notify.trim());
      if (!m) return fail(`${at}: notify= must look like "restart nginx" (restart, reload, start or stop + a service).`);
      const hn = `${m[1]} ${m[2]}`;
      const state = ({ restart: "restarted", reload: "reloaded", start: "started", stop: "stopped" } as Record<string, string>)[m[1]!];
      if (!handlers.has(hn)) handlers.set(hn, { name: hn, module: mod("service"), params: { name: m[2], state } });
      extra.notify = hn;
      delete kv.notify;
    }
    const left = Object.keys(kv);
    if (left.length) return fail(`${at}: "${verb}" does not take ${left.map((k) => k + "=").join(", ")}.`);
    tasks.push({ ...t, extra });
  }

  const taskObj = (t: Task) => {
    const out: Record<string, unknown> = { name: t.name, [t.module]: t.params };
    for (const k of ["when", "register", "loop", "become", "become_user", "ignore_errors", "notify"]) if (k in t.extra) out[k] = t.extra[k];
    const tags = [...(o.autoTags ? [t.tag] : []), ...((t.extra.tags as string[] | undefined) ?? [])];
    if (tags.length) out.tags = [...new Set(tags)];
    return out;
  };
  const play: Record<string, unknown> = { name: o.playName, hosts: o.hosts };
  if (o.become) play.become = true;
  play.gather_facts = o.gatherFacts;
  if (Object.keys(playVars).length) play.vars = playVars;
  play.tasks = tasks.map(taskObj);
  if (handlers.size) play.handlers = [...handlers.values()].map((h) => ({ name: h.name, [h.module]: h.params }));
  const yaml = dump([play], { lineWidth: 120, noRefs: true, indent: 2 });
  return { output: "---\n" + yaml, error: null };
}
