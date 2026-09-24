import type { BoardLayout, BoardSpan } from '@command/shared';
import { useCallback, useMemo, type ComponentType } from 'react';
import type { IconName } from '../components/ui/icons';
import { AttentionPanel } from '../features/attention/AttentionPanel';
import { CalendarCard } from '../features/calendar/CalendarCard';
import { GanttCard } from '../features/gantt/GanttCard';
import { GithubCard } from '../features/github/GithubCard';
import { KpiGrid } from '../features/kpis/KpiGrid';
import { MailCard } from '../features/mail/MailCard';
import { ProjectsCard } from '../features/projects/ProjectsCard';
import { RemindersCard } from '../features/reminders/RemindersCard';
import { TrelloCard } from '../features/trello/TrelloCard';
import { usePreference } from '../hooks/usePreference';

/** Width on the 12-column grid from 1200px. */
export type Span = BoardSpan;

export interface Widget {
  /** Also the section id (anchor, collapsed state). */
  id: string;
  title: string;
  icon: IconName;
  Component: ComponentType<{ className?: string }>;
  span: Span;
  /** Spans both columns of the 768px grid; by default when wider than half. */
  wide?: boolean;
  /** Has a collapse toggle (a `Card`). */
  collapsible: boolean;
}

/** The board in its default order: the demo's spans and order. */
export const WIDGETS: Widget[] = [
  { id: 'overview', title: 'Attention required', icon: 'alert', Component: AttentionPanel, span: 7, collapsible: false },
  { id: 'kpis', title: 'Today at a glance', icon: 'home', Component: KpiGrid, span: 5, wide: true, collapsible: false },
  { id: 'mail', title: 'Mail triage', icon: 'mail', Component: MailCard, span: 7, collapsible: true },
  { id: 'calendar', title: 'Calendar', icon: 'calendar', Component: CalendarCard, span: 5, collapsible: true },
  { id: 'github', title: 'GitHub', icon: 'git', Component: GithubCard, span: 7, collapsible: true },
  { id: 'reminders', title: 'Reminders', icon: 'checkSquare', Component: RemindersCard, span: 5, collapsible: true },
  { id: 'gantt', title: 'Personal Gantt', icon: 'gantt', Component: GanttCard, span: 12, collapsible: true },
  { id: 'trello', title: 'Trello tasks', icon: 'kanban', Component: TrelloCard, span: 8, collapsible: true },
  { id: 'projects', title: 'Projects', icon: 'folder', Component: ProjectsCard, span: 4, wide: true, collapsible: true },
];

/** The widths offered in the layout editor: the demo's own widths, so pairs fill a row (7+5, 8+4). */
export const SPAN_OPTIONS: { span: Span; label: string; hint: string }[] = [
  { span: 4, label: 'S', hint: 'Small, a third' },
  { span: 5, label: 'M', hint: 'Medium, pairs with L' },
  { span: 7, label: 'L', hint: 'Large, pairs with M' },
  { span: 8, label: 'XL', hint: 'Extra large, pairs with S' },
  { span: 12, label: 'Full', hint: 'Full width' },
];

// Written out in full so Tailwind's scanner sees every class.
const XL_SPAN: Record<Span, string> = {
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  12: 'xl:col-span-12',
};

/** Grid classes for a widget: one column on phones, 2 from 768px, 12 from 1200px. */
export const spanClass = (span: Span, wide: boolean) => `${wide ? 'md:col-span-2' : ''} ${XL_SPAN[span]}`;

export interface PlacedWidget extends Widget {
  wide: boolean;
  hidden: boolean;
}

const LAYOUT_KEY = 'cc-board-layout';
const DEFAULT_LAYOUT: BoardLayout = { order: WIDGETS.map((w) => w.id), spans: {}, hidden: [] };
const SPANS = new Set<number>(Object.keys(XL_SPAN).map(Number));

/** A stored layout made valid again: unknown ids dropped, new widgets appended (visible), bad widths ignored. */
function sanitize(raw: Partial<BoardLayout> | null | undefined): BoardLayout {
  const known = new Set(WIDGETS.map((w) => w.id));
  const order = (Array.isArray(raw?.order) ? raw.order : []).filter((id, i, a) => known.has(id) && a.indexOf(id) === i);
  for (const w of WIDGETS) if (!order.includes(w.id)) order.push(w.id);
  const spans = Object.fromEntries(
    Object.entries(raw?.spans ?? {}).filter(([id, s]) => known.has(id) && SPANS.has(s as number)),
  ) as Record<string, Span>;
  const hidden = (Array.isArray(raw?.hidden) ? raw.hidden : []).filter((id, i, a) => known.has(id) && a.indexOf(id) === i);
  return { order, spans, hidden };
}

/** The widgets in the user's order with their widths. */
export function placeWidgets(layout: BoardLayout): PlacedWidget[] {
  return layout.order.map((id) => {
    const w = WIDGETS.find((x) => x.id === id)!;
    const custom = layout.spans[id];
    const span = custom ?? w.span;
    // A custom width decides the 768px layout too: wider than half spans both columns.
    return {
      ...w,
      span,
      wide: custom ? span > 6 : (w.wide ?? w.span > 6),
      hidden: !!layout.hidden?.includes(id),
    };
  });
}

/** Board order and widths: a user preference, saved on the server. */
export function useBoardLayout() {
  const [stored, setStored] = usePreference('board', LAYOUT_KEY, DEFAULT_LAYOUT);
  const layout = useMemo(() => sanitize(stored), [stored]);
  const setLayout = useCallback(
    (fn: (l: BoardLayout) => BoardLayout) => setStored((prev) => fn(sanitize(prev))),
    [setStored],
  );

  const move = useCallback(
    (id: string, to: number) =>
      setLayout((l) => {
        const order = l.order.filter((x) => x !== id);
        order.splice(Math.max(0, Math.min(to, order.length)), 0, id);
        return { ...l, order };
      }),
    [setLayout],
  );
  const resize = useCallback(
    (id: string, span: Span) => setLayout((l) => ({ ...l, spans: { ...l.spans, [id]: span } })),
    [setLayout],
  );
  const toggleHidden = useCallback(
    (id: string) =>
      setLayout((l) => {
        const hidden = l.hidden ?? [];
        return { ...l, hidden: hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id] };
      }),
    [setLayout],
  );
  const reset = useCallback(() => setStored(DEFAULT_LAYOUT), [setStored]);
  const isDefault =
    layout.order.every((id, i) => id === DEFAULT_LAYOUT.order[i]) &&
    Object.keys(layout.spans).length === 0 &&
    !layout.hidden?.length;
  const widgets = useMemo(() => placeWidgets(layout), [layout]);

  return { layout, widgets, visible: widgets.filter((w) => !w.hidden), move, resize, toggleHidden, reset, isDefault };
}

/** Ids of the widgets the user hid: for the navigation, which leaves them out too. */
export function useHiddenWidgets(): ReadonlySet<string> {
  const [stored] = usePreference('board', LAYOUT_KEY, DEFAULT_LAYOUT);
  return useMemo(() => new Set(sanitize(stored).hidden), [stored]);
}
