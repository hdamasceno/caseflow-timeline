import { type TimelineItem, itemDateRange, statusText } from '../model/case';

export interface ItemTableProps {
  items: TimelineItem[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
}

/** A plain table of every item: the non-visual equivalent of the timeline. */
export function ItemTable({ items, selectedId, onSelect }: ItemTableProps) {
  return (
    <table className="items">
      <caption>All items, in date order</caption>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Type</th>
          <th scope="col">Date</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} aria-selected={item.id === selectedId} className={item.id === selectedId ? 'is-selected' : undefined}>
            <th scope="row">
              <button type="button" className="link" onClick={() => onSelect?.(item.id)}>
                {item.label}
              </button>
            </th>
            <td>{item.type}</td>
            <td>{itemDateRange(item)}</td>
            <td>
              {item.type === 'milestone' ? (
                '—'
              ) : (
                <span className={`pill pill--${item.status}`}>{statusText(item.status)}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
