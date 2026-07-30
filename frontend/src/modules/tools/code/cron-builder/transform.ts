export interface CronParseResult {
  valid: boolean;
  error: string | null;
  description: string | null;
  nextRuns: string[];
}

const FIELD_RANGES = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day of month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12 },
  { name: "day of week", min: 0, max: 6 },
] as const;

/** Parses a standard 5-field cron expression (minute hour dom month dow),
 * validates it, produces a human-readable description, and computes the
 * next N run times by brute-force minute-by-minute simulation (bounded to
 * avoid pathological infinite loops on impossible expressions like
 * Feb 30). No external cron library — the grammar is small enough to hand-roll
 * reliably and predictably. */
export function parseCron(expression: string, nextRunCount: number, from: Date = new Date()): CronParseResult {
  const trimmed = expression.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: null, description: null, nextRuns: [] };
  }

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) {
    return {
      valid: false,
      error: `Expected 5 fields (minute hour day-of-month month day-of-week), got ${fields.length}.`,
      description: null,
      nextRuns: [],
    };
  }

  const parsedFields: number[][] = [];
  for (let i = 0; i < 5; i++) {
    try {
      parsedFields.push(parseField(fields[i]!, FIELD_RANGES[i]!.min, FIELD_RANGES[i]!.max));
    } catch (err) {
      return {
        valid: false,
        error: `Invalid ${FIELD_RANGES[i]!.name} field "${fields[i]}": ${err instanceof Error ? err.message : "parse error"}`,
        description: null,
        nextRuns: [],
      };
    }
  }

  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parsedFields as [
    number[],
    number[],
    number[],
    number[],
    number[],
  ];

  const nextRuns = computeNextRuns({ minutes, hours, daysOfMonth, months, daysOfWeek }, nextRunCount, from);

  return {
    valid: true,
    error: null,
    description: describeCron(fields as [string, string, string, string, string]),
    nextRuns: nextRuns.map((d) => d.toISOString()),
  };
}

function parseField(field: string, min: number, max: number): number[] {
  const values = new Set<number>();

  for (const part of field.split(",")) {
    const stepMatch = /^(\*|\d+(?:-\d+)?)(\/(\d+))?$/.exec(part);
    if (!stepMatch) throw new Error(`Unrecognized syntax "${part}"`);

    const [, rangePart, , stepStr] = stepMatch;
    const step = stepStr ? Number(stepStr) : 1;
    if (step <= 0) throw new Error("Step must be a positive integer");

    let rangeMin = min;
    let rangeMax = max;
    if (rangePart !== "*") {
      const rangeMatch = /^(\d+)(?:-(\d+))?$/.exec(rangePart!);
      if (!rangeMatch) throw new Error(`Unrecognized range "${rangePart}"`);
      rangeMin = Number(rangeMatch[1]);
      rangeMax = rangeMatch[2] ? Number(rangeMatch[2]) : rangeMin;
    }

    if (rangeMin < min || rangeMax > max || rangeMin > rangeMax) {
      throw new Error(`Value out of range (${min}-${max})`);
    }

    for (let v = rangeMin; v <= rangeMax; v += step) values.add(v);
  }

  return Array.from(values).sort((a, b) => a - b);
}

interface CronFields {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
}

// Uses UTC getters/setters throughout so results are deterministic
// regardless of the host machine's timezone (tests pin exact UTC ISO
// strings). The tool surfaces this as "computed in UTC" in its UI.
function computeNextRuns(fields: CronFields, count: number, from: Date): Date[] {
  const results: Date[] = [];
  const candidate = new Date(from);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  const maxIterations = 60 * 24 * 366 * 4; // up to ~4 years of minutes
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;
    if (
      fields.minutes.includes(candidate.getUTCMinutes()) &&
      fields.hours.includes(candidate.getUTCHours()) &&
      fields.daysOfMonth.includes(candidate.getUTCDate()) &&
      fields.months.includes(candidate.getUTCMonth() + 1) &&
      fields.daysOfWeek.includes(candidate.getUTCDay())
    ) {
      results.push(new Date(candidate));
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }

  return results;
}

function describeCron([minute, hour, dom, month, dow]: [string, string, string, string, string]): string {
  const parts: string[] = [];

  const isSimpleNumber = (v: string) => /^\d+$/.test(v);

  if (minute === "*" && hour === "*") {
    parts.push("Every minute");
  } else if (isSimpleNumber(hour) && isSimpleNumber(minute)) {
    parts.push(`At ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
  } else {
    parts.push(`At minute ${minute} past hour ${hour}`);
  }

  if (dom !== "*") parts.push(`on day-of-month ${dom}`);
  if (month !== "*") parts.push(`in month ${month}`);
  if (dow !== "*") parts.push(`on day-of-week ${dow}`);

  return parts.join(" ");
}
