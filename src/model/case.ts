import { type DayNumber, type IsoDate, toDayNumber, fromDayNumber, formatDay } from '../lib/date';
import {
  type DeadlineRule,
  type DeadlineStatus,
  computeDeadline,
  deadlineStatus,
  describeRule,
} from '../lib/deadlines';
import type { BusinessCalendar } from '../lib/holidays';

export interface PhaseDef {
  id: string;
  label: string;
  start: IsoDate;
  /** Exclusive end. Leave out for a phase that is still running. */
  end?: IsoDate;
}

export interface MilestoneDef {
  id: string;
  label: string;
  date: IsoDate;
}

export interface DeadlineDef {
  id: string;
  label: string;
  /** The milestone id the rule counts from, or an ad-hoc start date. */
  anchor: string | { date: IsoDate; label: string };
  rule: DeadlineRule;
  completedOn?: IsoDate;
}

export interface CaseDef {
  id: string;
  title: string;
  subtitle: string;
  phases: PhaseDef[];
  milestones: MilestoneDef[];
  deadlines: DeadlineDef[];
}

export type PhaseStatus = 'done' | 'active' | 'planned';

export interface PhaseItem {
  type: 'phase';
  id: string;
  label: string;
  start: DayNumber;
  end: DayNumber;
  ongoing: boolean;
  status: PhaseStatus;
}

export interface MilestoneItem {
  type: 'milestone';
  id: string;
  label: string;
  day: DayNumber;
}

export interface DeadlineItem {
  type: 'deadline';
  id: string;
  label: string;
  day: DayNumber;
  status: DeadlineStatus;
  ruleText: string;
  anchorLabel: string;
  skippedHolidays: string[];
}

export type TimelineItem = PhaseItem | MilestoneItem | DeadlineItem;

export function itemStart(item: TimelineItem): DayNumber {
  return item.type === 'phase' ? item.start : item.day;
}

export function itemEnd(item: TimelineItem): DayNumber {
  return item.type === 'phase' ? item.end : item.day;
}

/** Turns the stored case definition into items with resolved dates and statuses. */
export function resolveCase(def: CaseDef, today: IsoDate, cal: BusinessCalendar): TimelineItem[] {
  const todayDay = toDayNumber(today);
  const milestones = new Map(def.milestones.map((m) => [m.id, m]));

  const phases: PhaseItem[] = def.phases.map((p) => {
    const start = toDayNumber(p.start);
    const ongoing = p.end === undefined;
    // A running phase is drawn up to tomorrow, so it always reaches the today line.
    const end = ongoing ? Math.max(start + 1, todayDay + 1) : toDayNumber(p.end as IsoDate);
    if (end < start) throw new RangeError(`Phase "${p.id}" ends before it starts`);
    const status: PhaseStatus =
      start > todayDay ? 'planned' : ongoing || end > todayDay ? 'active' : 'done';
    return { type: 'phase', id: p.id, label: p.label, start, end, ongoing, status };
  });

  const ms: MilestoneItem[] = def.milestones.map((m) => ({
    type: 'milestone',
    id: m.id,
    label: m.label,
    day: toDayNumber(m.date),
  }));

  const deadlines: DeadlineItem[] = def.deadlines.map((d) => {
    const anchor = typeof d.anchor === 'string' ? milestones.get(d.anchor) : d.anchor;
    if (!anchor) throw new Error(`Deadline "${d.id}" refers to unknown milestone "${String(d.anchor)}"`);
    const result = computeDeadline(anchor.date, d.rule, cal);
    const opts = d.completedOn ? { completedOn: d.completedOn } : {};
    return {
      type: 'deadline',
      id: d.id,
      label: d.label,
      day: toDayNumber(result.due),
      status: deadlineStatus(result.due, today, opts),
      ruleText: describeRule(d.rule),
      anchorLabel: anchor.label,
      skippedHolidays: result.skipped.flatMap((s) => (s.name ? [s.name] : [])),
    };
  });

  return [...phases, ...ms, ...deadlines].sort(
    (a, b) => itemStart(a) - itemStart(b) || (a.id < b.id ? -1 : 1),
  );
}

const STATUS_TEXT: Record<DeadlineStatus | PhaseStatus, string> = {
  met: 'met',
  overdue: 'overdue',
  'due-soon': 'due soon',
  upcoming: 'upcoming',
  done: 'done',
  active: 'in progress',
  planned: 'planned',
};

export function statusText(s: DeadlineStatus | PhaseStatus): string {
  return STATUS_TEXT[s];
}

/** A one-line description used for screen readers and the tooltip heading. */
export function describeItem(item: TimelineItem): string {
  switch (item.type) {
    case 'phase': {
      const until = item.ongoing ? 'ongoing' : `to ${formatDay(item.end - 1)}`;
      return `Phase ${item.label}, ${formatDay(item.start)} ${until}, ${statusText(item.status)}`;
    }
    case 'milestone':
      return `Milestone ${item.label}, ${formatDay(item.day)}`;
    case 'deadline':
      return `Deadline ${item.label}, due ${formatDay(item.day)}, ${statusText(item.status)}`;
  }
}

export function itemDateRange(item: TimelineItem): string {
  if (item.type !== 'phase') return formatDay(item.day);
  if (item.ongoing) return `${formatDay(item.start)} – ongoing`;
  return `${formatDay(item.start)} – ${formatDay(item.end - 1)}`;
}

export function toIso(day: DayNumber): IsoDate {
  return fromDayNumber(day);
}
