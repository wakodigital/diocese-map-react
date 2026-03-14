export type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export type TimeRange = {
  startMin: number;
  endMin: number;
  isPoint?: boolean; // true when the source only gives a single time
  raw?: string;
  source?: string;
};

export type ReconciliationSchedule = Partial<Record<Weekday, TimeRange[]>>;

export const WEEKDAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const KEYWORDS = [
  "reconciliation",
  "confession",
  "confessions",
  "confesión",
  "confesion",
  "confesiones",
];

export type TimeOption = {
  key: string; // e.g. "slot:930"
  minute: number; // minutes from midnight
  label: string; // e.g. "3:30 PM"
};

function normalizeDashes(s: string) {
  return s.replace(/[–—]/g, "-");
}

function normalizeAmPm(s: string) {
  return s
    .replace(/\ba\.m\.\b/gi, "am")
    .replace(/\bp\.m\.\b/gi, "pm")
    .replace(/\ba\.m\b/gi, "am")
    .replace(/\bp\.m\b/gi, "pm");
}

function includesKeyword(line: string): boolean {
  const lc = line.toLowerCase();
  return KEYWORDS.some((k) => lc.includes(k));
}

const dayIndex: Record<Weekday, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function expandDayRange(start: Weekday, end: Weekday): Weekday[] {
  const s = dayIndex[start];
  const e = dayIndex[end];
  if (s <= e) return WEEKDAYS.slice(s, e + 1);
  return [...WEEKDAYS.slice(s), ...WEEKDAYS.slice(0, e + 1)];
}

function parseWeekdayToken(tok: string): Weekday | null {
  const t = tok.trim().toLowerCase();

  for (const d of WEEKDAYS) if (t === d.toLowerCase()) return d;

  // English abbreviations
  if (t === "sun") return "Sunday";
  if (t === "mon") return "Monday";
  if (t === "tue" || t === "tues") return "Tuesday";
  if (t === "wed") return "Wednesday";
  if (t === "thu" || t === "thur" || t === "thurs") return "Thursday";
  if (t === "fri") return "Friday";
  if (t === "sat") return "Saturday";

  // Spanish
  if (t === "domingo") return "Sunday";
  if (t === "lunes") return "Monday";
  if (t === "martes") return "Tuesday";
  if (t === "miércoles" || t === "miercoles") return "Wednesday";
  if (t === "jueves") return "Thursday";
  if (t === "viernes") return "Friday";
  if (t === "sábado" || t === "sabado") return "Saturday";

  return null;
}

function extractDays(lineRaw: string): Weekday[] {
  const line = normalizeDashes(lineRaw);
  const lc = line.toLowerCase();

  // Day range: Tue-Fri
  const rangeMatch = lc.match(
    /\b(sun|mon|tue(?:s)?|wed|thu(?:r|rs)?|fri|sat|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\s*-\s*(sun|mon|tue(?:s)?|wed|thu(?:r|rs)?|fri|sat|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b/i
  );
  if (rangeMatch) {
    const start = parseWeekdayToken(rangeMatch[1]);
    const end = parseWeekdayToken(rangeMatch[2]);
    if (start && end) return expandDayRange(start, end);
  }

  // Slash list: Mon/Wed/Fri
  const slashMatch = lc.match(
    /\b(sun|mon|tue(?:s)?|wed|thu(?:r|rs)?|fri|sat)(?:\s*\/\s*(sun|mon|tue(?:s)?|wed|thu(?:r|rs)?|fri|sat))+/i
  );
  if (slashMatch) {
    return slashMatch[0]
      .split("/")
      .map((x) => parseWeekdayToken(x))
      .filter((x): x is Weekday => Boolean(x));
  }

  // Single day mention
  for (const token of [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sun",
    "Mon",
    "Tue",
    "Tues",
    "Wed",
    "Thu",
    "Thur",
    "Thurs",
    "Fri",
    "Sat",
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Sabado",
  ]) {
    if (lc.includes(token.toLowerCase())) {
      const d = parseWeekdayToken(token);
      if (d) return [d];
    }
  }

  return [];
}

function parseTimeToMinutes(raw: string): number | null {
  const s = normalizeAmPm(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "");

  // 24h: 15:30
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) return hh * 60 + mm;
    return null;
  }

  // 12h: 3pm, 3:30pm
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (!m12) return null;

  let hh = Number(m12[1]);
  const mm = m12[2] ? Number(m12[2]) : 0;
  const ap = m12[3];

  if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
  if (ap === "pm" && hh !== 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;

  return hh * 60 + mm;
}

function extractTimeRanges(lineRaw: string): { start: number; end: number; raw: string }[] {
  const line = normalizeAmPm(normalizeDashes(lineRaw));
  const results: { start: number; end: number; raw: string }[] = [];

  const reRange =
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})/gi;

  let m: RegExpExecArray | null;
  while ((m = reRange.exec(line)) !== null) {
    const s = parseTimeToMinutes(m[1]);
    const e = parseTimeToMinutes(m[2]);
    if (s == null || e == null) continue;
    results.push({
      start: Math.min(s, e),
      end: Math.max(s, e),
      raw: `${m[1]}-${m[2]}`,
    });
  }

  return results;
}

function extractPointTimes(lineRaw: string) {
  const line = normalizeAmPm(normalizeDashes(lineRaw));
  const results: { at: number; raw: string }[] = [];

  // 4:00pm, 4pm, 15:00
  const reTime = /(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/gi;

  let m: RegExpExecArray | null;
  while ((m = reTime.exec(line)) !== null) {
    const min = parseTimeToMinutes(m[1]);
    if (min == null) continue;
    results.push({ at: min, raw: m[1] });
  }

  return results;
}

export function parseReconciliationScheduleFromLines(
  lines: string[] | undefined | null
): ReconciliationSchedule {
  const schedule: ReconciliationSchedule = {};
  if (!lines?.length) return schedule;

  for (const rawLine of lines) {
    const line = (rawLine ?? "").trim();
    if (!line) continue;
    if (!includesKeyword(line)) continue;

    const days = extractDays(line);
    if (!days.length) continue;

    const ranges = extractTimeRanges(line);
    const points = ranges.length === 0 ? extractPointTimes(line) : [];
    if (ranges.length === 0 && points.length === 0) continue;

    for (const day of days) {
      schedule[day] = schedule[day] ?? [];

      for (const r of ranges) {
        schedule[day]!.push({
          startMin: r.start,
          endMin: r.end,
          isPoint: false,
          raw: r.raw,
          source: line,
        });
      }

      for (const p of points) {
        schedule[day]!.push({
          startMin: p.at,
          endMin: p.at,
          isPoint: true,
          raw: p.raw,
          source: line,
        });
      }
    }
  }

  return schedule;
}

export function mergeSchedules(
  a: ReconciliationSchedule,
  b: ReconciliationSchedule
): ReconciliationSchedule {
  const out: ReconciliationSchedule = { ...a };
  for (const day of WEEKDAYS) {
    const add = b[day];
    if (!add?.length) continue;
    out[day] = [...(out[day] ?? []), ...add];
  }
  return out;
}

export function parseReconciliationSchedule(opts: {
  other?: string[] | null;
  massTimes?: string[] | null;
}): ReconciliationSchedule {
  const s1 = parseReconciliationScheduleFromLines(opts.other);
  const s2 = parseReconciliationScheduleFromLines(opts.massTimes);
  return mergeSchedules(s1, s2);
}

export function timeWithinAnyRange(timeMin: number, ranges: TimeRange[] | undefined): boolean {
  if (!ranges?.length) return false;

  return ranges.some((r) => {
    if (r.isPoint) return timeMin === r.startMin;
    return timeMin >= r.startMin && timeMin <= r.endMin;
  });
}

export function hhmmToMinutes(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/* ------------------- Slot-based “available anytime within range” ------------------- */

function minutesToLabel(min: number): string {
  const hh24 = Math.floor(min / 60) % 24;
  const mm = min % 60;

  const ap = hh24 >= 12 ? "PM" : "AM";
  let hh12 = hh24 % 12;
  if (hh12 === 0) hh12 = 12;

  return `${hh12}:${String(mm).padStart(2, "0")} ${ap}`;
}

function roundDownToStep(min: number, step: number) {
  return Math.floor(min / step) * step;
}

function roundUpToStep(min: number, step: number) {
  return Math.ceil(min / step) * step;
}

export function buildTimeSlotsForDay(
  locations: Array<{ other?: string[] | null; massTimes?: string[] | null }>,
  day: Weekday,
  stepMinutes = 15
): TimeOption[] {
  const slots = new Map<number, TimeOption>();

  for (const loc of locations) {
    const sched = parseReconciliationSchedule({ other: loc.other, massTimes: loc.massTimes });
    const entries = sched[day] ?? [];

    for (const r of entries) {
      if (r.isPoint) {
        const minute = r.startMin;
        slots.set(minute, { key: `slot:${minute}`, minute, label: minutesToLabel(minute) });
        continue;
      }

      const start = roundUpToStep(r.startMin, stepMinutes);
      const end = roundDownToStep(r.endMin, stepMinutes);

      for (let m = start; m <= end; m += stepMinutes) {
        if (!slots.has(m)) {
          slots.set(m, { key: `slot:${m}`, minute: m, label: minutesToLabel(m) });
        }
      }
    }
  }

  return Array.from(slots.values()).sort((a, b) => a.minute - b.minute);
}

export function locationHasConfessionAtMinute(
  loc: { other?: string[] | null; massTimes?: string[] | null },
  day: Weekday,
  minute: number
): boolean {
  const sched = parseReconciliationSchedule({ other: loc.other, massTimes: loc.massTimes });
  const entries = sched[day] ?? [];

  return entries.some((r) => {
    if (r.isPoint) return minute === r.startMin;
    return minute >= r.startMin && minute <= r.endMin;
  });
}
