import type { TransformResult } from "@/lib/tool-transform";
import type { CronToSystemdTimerOptions } from "./schema";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ABBR = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SHORTCUTS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: string[];
  nameOffset?: number;
}
const FIELDS: FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: MONTHS, nameOffset: 1 },
  { name: "day of week", min: 0, max: 7, names: DAY_ABBR, nameOffset: 0 },
];

/** Expands one cron field to its sorted values, or "*" when it matches everything. */
function expand(field: string, spec: FieldSpec): number[] | "*" {
  const values = new Set<number>();
  const num = (t: string): number => {
    const lower = t.toLowerCase();
    const idx = spec.names?.indexOf(lower.slice(0, 3)) ?? -1;
    const n = idx >= 0 ? idx + (spec.nameOffset ?? 0) : /^\d+$/.test(t) ? Number(t) : NaN;
    if (!Number.isInteger(n) || n < spec.min || n > spec.max) throw new Error(`"${t}" is not a valid ${spec.name} (${spec.min}-${spec.max}).`);
    return n;
  };
  for (const part of field.split(",")) {
    if (!part) throw new Error(`Empty list item in the ${spec.name} field.`);
    const [range = "", stepText] = part.split("/");
    let step = 1;
    if (stepText !== undefined) {
      step = Number(stepText);
      if (!Number.isInteger(step) || step < 1) throw new Error(`Bad step "/${stepText}" in the ${spec.name} field.`);
    }
    let lo: number;
    let hi: number;
    if (range === "*" || range === "?") {
      lo = spec.min;
      hi = spec.name === "day of week" ? 6 : spec.max;
      if (step === 1 && stepText === undefined && field === range) return "*";
    } else if (range.includes("-")) {
      const [a = "", b = ""] = range.split("-");
      lo = num(a);
      hi = num(b);
      if (lo > hi) throw new Error(`The range ${range} in the ${spec.name} field runs backwards.`);
    } else {
      lo = num(range);
      hi = stepText !== undefined ? (spec.name === "day of week" ? 6 : spec.max) : lo;
    }
    for (let v = lo; v <= hi; v += step) values.add(spec.name === "day of week" && v === 7 ? 0 : v);
  }
  const out = [...values].sort((a, b) => a - b);
  const full = spec.name === "day of week" ? 7 : spec.max - spec.min + 1;
  return out.length === full ? "*" : out;
}

/** Collapses sorted numbers into systemd syntax: 1,2,3,7 -> "1..3,7"; evenly spaced runs use /step. */
function compact(values: number[], pad: number, min: number, max: number): string {
  if (values.length > 2) {
    const first = values[0]!;
    const step = values[1]! - first;
    if (step > 1 && values.every((v, i) => v === first + i * step) && values[values.length - 1]! + step > max) {
      return `${String(first).padStart(pad, "0")}/${step}`;
    }
  }
  const parts: string[] = [];
  for (let i = 0; i < values.length; ) {
    let j = i;
    while (j + 1 < values.length && values[j + 1]! === values[j]! + 1) j++;
    const a = String(values[i]).padStart(pad, "0");
    parts.push(j - i >= 2 ? `${a}..${String(values[j]).padStart(pad, "0")}` : values.slice(i, j + 1).map((v) => String(v).padStart(pad, "0")).join(","));
    i = j + 1;
  }
  return parts.join(",");
}

export function cronToOnCalendar(expression: string, timezone = ""): { value: string; notes: string[] } {
  let expr = expression.trim().replace(/\s+/g, " ");
  const notes: string[] = [];
  if (expr.startsWith("@")) {
    if (expr === "@reboot") throw new Error("@reboot has no calendar equivalent. Use OnBootSec=1min in the [Timer] section instead.");
    const mapped = SHORTCUTS[expr.toLowerCase()];
    if (!mapped) throw new Error(`Unknown shortcut ${expr}.`);
    expr = mapped;
  }
  const fields = expr.split(" ");
  if (fields.length === 6) throw new Error("This looks like a 6-field (seconds) expression. Remove the seconds field, or use a standard 5-field cron line.");
  if (fields.length !== 5) throw new Error(`A cron expression has 5 fields (minute hour day-of-month month day-of-week); found ${fields.length}.`);
  const [mi, ho, dom, mon, dow] = fields.map((f, i) => expand(f, FIELDS[i]!)) as [number[] | "*", number[] | "*", number[] | "*", number[] | "*", number[] | "*"];

  if (dom !== "*" && dow !== "*") {
    notes.push("cron runs when EITHER the day of month OR the weekday matches; systemd needs both. This conversion uses the weekday only. Create a second timer for the day-of-month case if you need both.");
  }
  const minutes = mi === "*" ? "*" : compact(mi, 2, 0, 59);
  const hours = ho === "*" ? "*" : compact(ho, 2, 0, 23);
  const time = `${hours}:${minutes}:00`;
  const date = `*-${mon === "*" ? "*" : compact(mon, 2, 1, 12)}-${dom === "*" || dow !== "*" ? "*" : compact(dom, 2, 1, 31)}`;
  let weekday = "";
  if (dow !== "*") {
    const sorted = [...dow];
    weekday = sorted.length > 2 && sorted.every((v, i) => i === 0 || v === sorted[i - 1]! + 1) ? `${DAYS[sorted[0]!]}..${DAYS[sorted[sorted.length - 1]!]}` : sorted.map((d) => DAYS[d]).join(",");
    // systemd weekday ranges must not wrap, which expand() guarantees by sorting.
  }
  const value = [weekday, date, time].filter(Boolean).join(" ") + (timezone ? ` ${timezone}` : "");
  return { value, notes };
}

export function convertCronToSystemd(input: string, options: Partial<CronToSystemdTimerOptions>): TransformResult {
  const o: CronToSystemdTimerOptions = {
    unitName: options.unitName ?? "backup",
    command: options.command ?? "/usr/local/bin/backup.sh",
    description: options.description ?? "",
    user: options.user ?? "",
    persistent: options.persistent ?? true,
    randomizedDelaySec: options.randomizedDelaySec ?? 0,
    timezone: options.timezone ?? "",
    output: options.output ?? "units",
  };
  if (!input.trim()) return { output: "", error: null };
  let result;
  try {
    result = cronToOnCalendar(input, o.timezone.trim());
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
  if (o.output === "oncalendar") return { output: [`OnCalendar=${result.value}`, ...result.notes.map((n) => `# Note: ${n}`)].join("\n"), error: null };
  const name = o.unitName.trim().replace(/[^A-Za-z0-9_.@-]/g, "-") || "job";
  const desc = o.description.trim() || `${name} job (converted from cron: ${input.trim()})`;
  const timer = [
    "[Unit]",
    `Description=Timer for ${desc}`,
    "",
    "[Timer]",
    `OnCalendar=${result.value}`,
    ...(o.persistent ? ["Persistent=true"] : []),
    ...(o.randomizedDelaySec ? [`RandomizedDelaySec=${o.randomizedDelaySec}`] : []),
    `Unit=${name}.service`,
    "",
    "[Install]",
    "WantedBy=timers.target",
  ];
  const service = ["[Unit]", `Description=${desc}`, "", "[Service]", "Type=oneshot", ...(o.user.trim() ? [`User=${o.user.trim()}`] : []), `ExecStart=${o.command.trim() || "/bin/true"}`];
  const out = [
    ...result.notes.map((n) => `# Note: ${n}`),
    `# /etc/systemd/system/${name}.timer`,
    ...timer,
    "",
    `# /etc/systemd/system/${name}.service`,
    ...service,
    "",
    "# Enable:",
    `#   sudo systemctl daemon-reload && sudo systemctl enable --now ${name}.timer`,
    `# Check the schedule: systemd-analyze calendar "${result.value}" --iterations=5`,
  ];
  return { output: out.join("\n"), error: null };
}
