// Pure flexbox layout — no JS-measured pixel offset. An earlier version
// measured the header's rendered height via getBoundingClientRect() (in a
// mount effect + ResizeObserver) and used that pixel value as the detail
// pane's `top`, so only the transaction list would scroll while the month
// grid and date row stayed put. That measurement could race with layout
// (observed on a real device: the detail pane locked in at a height as if
// the grid had only rendered 1-2 of its 5 rows, so it rendered overlapping
// the rest of the grid instead of below it) and could go stale on the
// visual-viewport changes iOS causes when its toolbar shows/hides.
// Flexbox gets the same "grid and date row stay fixed, only the list
// scrolls" result declaratively — the header and date row size to their
// content, the list gets `flex-1 min-h-0` to fill and scroll the rest —
// with no measurement to race, so there's no wrong-height state possible.
export function CalendarScrollPane({
  header,
  dateRow,
  list,
}: {
  header: React.ReactNode;
  dateRow: React.ReactNode;
  list: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 touch-none">{header}</div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 touch-none pt-2">{dateRow}</div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{list}</div>
      </div>
    </div>
  );
}
