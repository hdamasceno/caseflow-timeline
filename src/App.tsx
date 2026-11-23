import { useMemo, useState } from 'react';
import { DeadlineCalculator } from './components/DeadlineCalculator';
import { ItemTable } from './components/ItemTable';
import { Timeline } from './components/Timeline';
import { type IsoDate, formatIso, isValidIso } from './lib/date';
import { BusinessCalendar } from './lib/holidays';
import { type CaseDef, type DeadlineDef, resolveCase } from './model/case';
import { DEMO_TODAY, demoCase } from './model/demoCase';

export interface AppProps {
  initialToday?: IsoDate;
  caseDef?: CaseDef;
  /** Forwarded to the timeline; tests use a fixed width. */
  timelineWidth?: number;
}

const calendar = new BusinessCalendar();

export default function App({ initialToday = DEMO_TODAY, caseDef = demoCase, timelineWidth }: AppProps) {
  const [today, setToday] = useState<IsoDate>(initialToday);
  const [extra, setExtra] = useState<DeadlineDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const items = useMemo(
    () => resolveCase({ ...caseDef, deadlines: [...caseDef.deadlines, ...extra] }, today, calendar),
    [caseDef, extra, today],
  );

  const counts = useMemo(() => {
    const c = { overdue: 0, 'due-soon': 0, upcoming: 0, met: 0 };
    for (const i of items) if (i.type === 'deadline') c[i.status] += 1;
    return c;
  }, [items]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>{caseDef.title}</h1>
          <p className="muted">{caseDef.subtitle}</p>
        </div>
        <label className="asof">
          As of
          <input
            type="date"
            value={today}
            onChange={(e) => isValidIso(e.target.value) && setToday(e.target.value)}
          />
        </label>
      </header>

      <section className="summary" aria-label="Deadline summary">
        <span className="pill pill--overdue">{counts.overdue} overdue</span>
        <span className="pill pill--due-soon">{counts['due-soon']} due within 7 days</span>
        <span className="pill pill--upcoming">{counts.upcoming} upcoming</span>
        <span className="pill pill--met">{counts.met} met</span>
        <span className="muted">Status as of {formatIso(today)}</span>
      </section>

      <main>
        <section className="card" aria-label="Timeline">
          <Timeline
            items={items}
            today={today}
            selectedId={selectedId}
            onSelect={setSelectedId}
            {...(timelineWidth ? { width: timelineWidth } : {})}
          />
          <Legend />
        </section>

        <div className="columns">
          <section className="card">
            <DeadlineCalculator
              calendar={calendar}
              defaultStart={today}
              onAdd={({ label, start, rule }) => {
                const id = `custom-${extra.length + 1}`;
                setExtra((xs) => [...xs, { id, label, anchor: { date: start, label: formatIso(start) }, rule }]);
                setSelectedId(id);
              }}
            />
          </section>
          <section className="card">
            <ItemTable items={items} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
        </div>
      </main>
    </div>
  );
}

function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      <li><span className="swatch swatch--done" />Phase done</li>
      <li><span className="swatch swatch--active" />Phase in progress</li>
      <li><span className="swatch swatch--planned" />Phase planned</li>
      <li><span className="swatch swatch--milestone" />Milestone</li>
      <li><span className="swatch swatch--overdue" />Overdue</li>
      <li><span className="swatch swatch--due-soon" />Due soon</li>
      <li><span className="swatch swatch--upcoming" />Upcoming</li>
      <li><span className="swatch swatch--met" />Met</li>
    </ul>
  );
}
