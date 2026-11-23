import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type IsoDate, toDayNumber } from '../lib/date';
import { packLanes } from '../lib/layout';
import { fitLabel, textWidth } from '../lib/text';
import { chooseTickUnit, createScale, generateTicks } from '../lib/scale';
import {
  type Viewport,
  type ViewportLimits,
  clampViewport,
  panBy,
  reveal,
  zoomAt,
} from '../lib/viewport';
import {
  type TimelineItem,
  describeItem,
  itemDateRange,
  itemEnd,
  itemStart,
  statusText,
} from '../model/case';
import { useElementWidth } from './useElementWidth';

export interface TimelineProps {
  items: TimelineItem[];
  today: IsoDate;
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
  /** Fixed width in px. When left out, the timeline fills its container. */
  width?: number;
}

const PAD_X = 16;
const AXIS_H = 40;
const LANE_H = 34;
const BAR_H = 22;
const MARKER_ROW_H = 30;
const LABEL_LANE_H = 16;
const ZOOM_STEP = 1.5;
const DRAG_THRESHOLD_PX = 4;


function fullViewport(limits: ViewportLimits): Viewport {
  return clampViewport({ start: limits.bounds[0], end: limits.bounds[1] }, limits);
}

export function Timeline({ items, today, selectedId, onSelect, width: fixedWidth }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const measured = useElementWidth(containerRef, 960);
  const width = fixedWidth ?? measured;
  const tooltipId = useId();
  const clipId = useId();
  const todayDay = toDayNumber(today);

  const limits = useMemo<ViewportLimits>(() => {
    const lo = Math.min(todayDay, ...items.map(itemStart));
    const hi = Math.max(todayDay + 1, ...items.map(itemEnd));
    return { minSpan: 14, maxSpan: 365 * 3, bounds: [lo - 21, hi + 21] };
  }, [items, todayDay]);

  // The stored window may go stale when the data (and so the bounds) change;
  // clamping during render keeps it valid without an extra effect pass.
  const [rawViewport, setRawViewport] = useState<Viewport>(() => fullViewport(limits));
  const viewport = useMemo(() => clampViewport(rawViewport, limits), [rawViewport, limits]);
  const setViewport = useCallback(
    (fn: (vp: Viewport) => Viewport) => setRawViewport((raw) => fn(clampViewport(raw, limits))),
    [limits],
  );

  const scale = useMemo(
    () => createScale([viewport.start, viewport.end], [PAD_X, width - PAD_X]),
    [viewport, width],
  );
  const tickUnit = chooseTickUnit(scale.pxPerDay);
  const ticks = useMemo(() => generateTicks(scale, tickUnit), [scale, tickUnit]);

  const phases = useMemo(() => items.filter((i) => i.type === 'phase'), [items]);
  const markers = useMemo(() => items.filter((i) => i.type !== 'phase'), [items]);

  // Phase lanes are packed in day units, so rows stay put while zooming.
  const phaseLayout = useMemo(
    () => packLanes(phases.map((p) => ({ id: p.id, start: p.start, end: p.end })), 2),
    [phases],
  );

  // Marker labels are packed in pixels, so they never overlap at the current zoom.
  const labelLayout = useMemo(
    () =>
      packLanes(
        markers.map((m) => {
          const x = scale.x(itemStart(m));
          return { id: m.id, start: x, end: x + 12 + textWidth(m.label) };
        }),
        8,
      ),
    [markers, scale],
  );

  const plotTop = AXIS_H;
  const phasesH = phaseLayout.laneCount * LANE_H;
  const markerY = plotTop + phasesH + MARKER_ROW_H / 2 + 6;
  const height = markerY + MARKER_ROW_H / 2 + labelLayout.laneCount * LABEL_LANE_H + 12;

  // Roving tabindex: one item is in the tab order, arrows move between items.
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, SVGGElement>());

  const revealItem = (item: TimelineItem) => {
    setViewport((vp) => reveal(vp, itemStart(item), itemEnd(item), limits, 3));
  };

  // Follow a selection made outside the timeline (e.g. from the table).
  // Adjusting state while rendering is React's recommended pattern for this.
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId);
    const idx = items.findIndex((i) => i.id === selectedId);
    const item = items[idx];
    if (item) {
      setActiveIndex(idx);
      revealItem(item);
    }
  }

  const focusItem = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    setActiveIndex(idx);
    revealItem(item);
    itemRefs.current.get(item.id)?.focus();
  };

  const zoom = useCallback(
    (factor: number, anchorDay?: number) => {
      setViewport((vp) => zoomAt(vp, factor, anchorDay ?? (vp.start + vp.end) / 2, limits));
    },
    [limits, setViewport],
  );

  const fitAll = () => setViewport(() => fullViewport(limits));
  const goToday = () =>
    setViewport((vp) => panBy(vp, todayDay - (vp.start + vp.end) / 2, limits));

  // Wheel: vertical wheel zooms around the cursor, horizontal wheel/trackpad pans.
  // React registers wheel listeners as passive, so preventDefault needs a native listener.
  const scaleRef = useRef(scale);
  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = scaleRef.current;
      const rect = svg.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setViewport((vp) => panBy(vp, e.deltaX / s.pxPerDay, limits));
      } else {
        const anchor = s.invert(e.clientX - rect.left);
        setViewport((vp) => zoomAt(vp, Math.exp(-e.deltaY * 0.0015), anchor, limits));
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [limits, setViewport]);

  // Drag to pan. A drag must not also count as a click on an item.
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, start: viewport.start, moved: false };
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setViewport((vp) => panBy(vp, d.start - dx / scale.pxPerDay - vp.start, limits));
  };
  const endDrag = () => {
    suppressClick.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  const select = (item: TimelineItem, idx: number) => {
    setActiveIndex(idx);
    onSelect?.(item.id);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = (viewport.end - viewport.start) / 8;
    const current = items[activeIndex];
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        if (e.shiftKey) setViewport((vp) => panBy(vp, dir * step, limits));
        else focusItem(Math.min(items.length - 1, Math.max(0, activeIndex + dir)));
        break;
      }
      case 'Home':
        focusItem(0);
        break;
      case 'End':
        focusItem(items.length - 1);
        break;
      case '+':
      case '=':
        zoom(ZOOM_STEP, current ? itemStart(current) : undefined);
        break;
      case '-':
      case '_':
        zoom(1 / ZOOM_STEP, current ? itemStart(current) : undefined);
        break;
      case '0':
        fitAll();
        break;
      case 'Enter':
      case ' ':
        if (current) select(current, activeIndex);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const tipId = hoveredId ?? focusedId;
  const tipItem = tipId ? items.find((i) => i.id === tipId) : undefined;

  const visibleX = (day: number) => Math.min(width - PAD_X, Math.max(PAD_X, scale.x(day)));

  return (
    <div className="timeline" ref={containerRef}>
      <div className="timeline__toolbar" role="toolbar" aria-label="Timeline view">
        <button type="button" onClick={() => zoom(ZOOM_STEP)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoom(1 / ZOOM_STEP)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={fitAll}>
          Fit
        </button>
        <button type="button" onClick={goToday}>
          Today
        </button>
        <span className="timeline__scale" data-testid="tick-unit">
          {tickUnit}
        </span>
      </div>

      <svg
        ref={svgRef}
        className="timeline__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-roledescription="timeline"
        aria-label="Case timeline. Use the arrow keys to move between items, plus and minus to zoom, 0 to fit."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD_X} y={0} width={Math.max(0, width - 2 * PAD_X)} height={height} />
          </clipPath>
        </defs>

        <g className="axis" aria-hidden="true">
          <line className="axis__base" x1={PAD_X} x2={width - PAD_X} y1={AXIS_H - 8} y2={AXIS_H - 8} />
          {ticks.map((t) => (
            <g key={t.day} transform={`translate(${scale.x(t.day)},0)`} data-testid="tick">
              <line
                className={t.major ? 'grid grid--major' : 'grid'}
                y1={AXIS_H - 8}
                y2={height - 4}
              />
              <text className={t.major ? 'axis__label axis__label--major' : 'axis__label'} x={4} y={AXIS_H - 16}>
                {t.label}
              </text>
            </g>
          ))}
        </g>

        <g clipPath={`url(#${clipId})`}>
          <g className="today" aria-hidden="true" transform={`translate(${scale.x(todayDay + 0.5)},0)`}>
            <line y1={AXIS_H - 8} y2={height - 4} />
            <rect x={-20} y={AXIS_H - 8} width={40} height={14} rx={3} />
            <text x={0} y={AXIS_H + 2} textAnchor="middle">
              Today
            </text>
          </g>

          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isSelected = item.id === selectedId;
            const common = {
              ref: (el: SVGGElement | null) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              },
              role: 'button',
              tabIndex: isActive ? 0 : -1,
              'aria-label': describeItem(item),
              'aria-pressed': isSelected,
              'aria-describedby': tipId === item.id ? tooltipId : undefined,
              'data-testid': `item-${item.id}`,
              onFocus: () => {
                setActiveIndex(idx);
                setFocusedId(item.id);
              },
              onBlur: () => setFocusedId((f) => (f === item.id ? null : f)),
              onPointerEnter: () => setHoveredId(item.id),
              onPointerLeave: () => setHoveredId((h) => (h === item.id ? null : h)),
              onClick: () => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                select(item, idx);
              },
            } as const;

            if (item.type === 'phase') {
              const x0 = scale.x(item.start);
              const x1 = scale.x(item.end);
              const y = plotTop + (phaseLayout.lane[item.id] ?? 0) * LANE_H + (LANE_H - BAR_H) / 2;
              const w = Math.max(2, x1 - x0);
              const label = fitLabel(item.label, w - 14);
              return (
                <g
                  key={item.id}
                  {...common}
                  className={`item phase phase--${item.status}${isSelected ? ' is-selected' : ''}`}
                >
                  <rect x={x0} y={y} width={w} height={BAR_H} rx={5} />
                  {item.ongoing && (
                    <path className="phase__ongoing" d={`M${x1},${y} l8,${BAR_H / 2} l-8,${BAR_H / 2} z`} />
                  )}
                  {label && (
                    <text x={Math.max(x0, PAD_X) + 8} y={y + BAR_H / 2 + 4}>
                      {label}
                    </text>
                  )}
                </g>
              );
            }

            const x = scale.x(item.day + 0.5);
            const labelLane = labelLayout.lane[item.id] ?? 0;
            const labelY = markerY + MARKER_ROW_H / 2 + 4 + labelLane * LABEL_LANE_H;
            const cls =
              item.type === 'deadline' ? `item marker deadline deadline--${item.status}` : 'item marker milestone';
            return (
              <g key={item.id} {...common} className={`${cls}${isSelected ? ' is-selected' : ''}`}>
                <line className="marker__stem" x1={x} x2={x} y1={plotTop} y2={markerY} />
                <line className="marker__leader" x1={x} x2={x} y1={markerY} y2={labelY - 4} />
                {item.type === 'milestone' ? (
                  <path className="marker__shape" d={`M${x},${markerY - 8} l8,8 l-8,8 l-8,-8 z`} />
                ) : (
                  <path
                    className="marker__shape"
                    d={`M${x - 1},${markerY - 10} v20 M${x - 1},${markerY - 10} h12 l-4,5 l4,5 h-12 z`}
                  />
                )}
                <text className="marker__label" x={x + 6} y={labelY + 4}>
                  {item.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {tipItem && (
        <div
          id={tooltipId}
          role="tooltip"
          className="timeline__tooltip"
          style={{
            left: Math.min(width - 260, Math.max(0, visibleX(itemStart(tipItem)) - 20)),
            top:
              tipItem.type === 'phase'
                ? plotTop + ((phaseLayout.lane[tipItem.id] ?? 0) + 1) * LANE_H + 36
                : markerY + 60,
          }}
        >
          <strong>{tipItem.label}</strong>
          <div>{itemDateRange(tipItem)}</div>
          {tipItem.type === 'phase' && (
            <div>
              {tipItem.end - tipItem.start} days · {statusText(tipItem.status)}
            </div>
          )}
          {tipItem.type === 'deadline' && (
            <>
              <div>
                {tipItem.ruleText} after “{tipItem.anchorLabel}”
              </div>
              <div className={`pill pill--${tipItem.status}`}>{statusText(tipItem.status)}</div>
              {tipItem.skippedHolidays.length > 0 && (
                <div className="muted">Skips: {tipItem.skippedHolidays.join(', ')}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
