import { type FormEvent, useId, useState } from 'react';
import { type IsoDate, formatIso, isValidIso } from '../lib/date';
import { type DeadlineRule, computeDeadline } from '../lib/deadlines';
import type { BusinessCalendar } from '../lib/holidays';

export interface DeadlineCalculatorProps {
  calendar: BusinessCalendar;
  defaultStart: IsoDate;
  onAdd?: (entry: { label: string; start: IsoDate; rule: DeadlineRule }) => void;
}

export function DeadlineCalculator({ calendar, defaultStart, onAdd }: DeadlineCalculatorProps) {
  const id = useId();
  const [start, setStart] = useState(defaultStart);
  const [kind, setKind] = useState<DeadlineRule['kind']>('business-days');
  const [daysText, setDaysText] = useState('30');
  const [rollForward, setRollForward] = useState(true);
  const [label, setLabel] = useState('Custom deadline');

  const days = Number(daysText);
  const daysValid = daysText.trim() !== '' && Number.isInteger(days) && days >= 0 && days <= 3650;
  const startValid = isValidIso(start);

  const rule: DeadlineRule | null = daysValid
    ? kind === 'business-days'
      ? { kind, days }
      : { kind, days, rollForward }
    : null;

  // Cheap enough (a few hundred day checks at most) to run on every render.
  const result = rule && startValid ? computeDeadline(start, rule, calendar) : null;

  const holidays = result?.skipped.filter((s) => s.reason !== 'weekend') ?? [];
  const weekendCount = result?.skipped.filter((s) => s.reason === 'weekend').length ?? 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (rule && startValid && label.trim()) onAdd?.({ label: label.trim(), start, rule });
  };

  return (
    <form className="calc" onSubmit={submit} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Deadline calculator</h2>
      <div className="calc__grid">
        <label>
          Counts from
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          Rule
          <select value={kind} onChange={(e) => setKind(e.target.value as DeadlineRule['kind'])}>
            <option value="business-days">Business days</option>
            <option value="calendar-days">Calendar days</option>
          </select>
        </label>
        <label>
          Days
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={3650}
            value={daysText}
            onChange={(e) => setDaysText(e.target.value)}
            aria-invalid={!daysValid}
            aria-describedby={daysValid ? undefined : `${id}-days-err`}
          />
        </label>
        {kind === 'calendar-days' && (
          <label className="calc__check">
            <input
              type="checkbox"
              checked={rollForward}
              onChange={(e) => setRollForward(e.target.checked)}
            />
            Move to next business day
          </label>
        )}
      </div>
      {!daysValid && (
        <p id={`${id}-days-err`} className="error" role="alert">
          Enter a whole number of days from 0 to 3650.
        </p>
      )}

      <output className="calc__result" aria-live="polite" data-testid="calc-result">
        {result ? (
          <>
            <span className="calc__due">Due {formatIso(result.due)}</span>
            {result.rolledFrom && (
              <span className="muted"> (moved from {formatIso(result.rolledFrom)})</span>
            )}
            <span className="muted">
              {' '}
              · skips {weekendCount} weekend day{weekendCount === 1 ? '' : 's'}
              {holidays.length > 0 && ` and ${holidays.length} holiday${holidays.length === 1 ? '' : 's'}`}
            </span>
          </>
        ) : (
          <span className="muted">Fill in the fields to see the due date.</span>
        )}
      </output>
      {holidays.length > 0 && (
        <ul className="calc__holidays" aria-label="Holidays skipped">
          {holidays.map((h) => (
            <li key={h.date}>
              {formatIso(h.date)} — {h.name}
            </li>
          ))}
        </ul>
      )}

      <div className="calc__add">
        <label>
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <button type="submit" disabled={!result || !label.trim()}>
          Add to timeline
        </button>
      </div>
    </form>
  );
}
