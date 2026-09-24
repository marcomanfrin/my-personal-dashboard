import { useRef, useState } from 'react';
import { Lamp, lvl } from '../components/ui/primitives';
import { IconButton } from '../components/ui/primitives';
import { useDrawer } from '../drawer/DrawerContext';
import { attentionTitle, attentionWhen } from '../features/attention/wording';
import { useClickOutside } from '../hooks/useClickOutside';
import { useDashboard } from '../hooks/useDashboard';
import { storage } from '../lib/storage';

const SEEN_KEY = 'cc-notif-seen';

/** The bell: critical and high attention items; the badge counts the unseen ones. */
export function NotificationsMenu() {
  const { insights, data, now } = useDashboard();
  const { openRecord } = useDrawer();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>(() => storage.get(SEEN_KEY, []));
  const root = useRef<HTMLDivElement>(null);
  useClickOutside(root, () => setOpen(false), open);

  const items = insights.attention.filter((i) => i.level === 'critical' || i.level === 'high');
  const unseen = items.filter((i) => !seen.includes(i.key)).length;

  const markSeen = () => {
    const keys = items.map((i) => i.key);
    setSeen(keys);
    storage.set(SEEN_KEY, keys);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <IconButton
        icon="bell"
        label={`Notifications, ${unseen} new`}
        tip="Notifications"
        aria-expanded={open}
        aria-controls="notif-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {unseen > 0 && (
          <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-canvas bg-crit px-1 text-[10px] font-extrabold text-white">
            {unseen}
          </span>
        )}
      </IconButton>
      {open && (
        <div
          id="notif-panel"
          className="absolute top-[calc(100%+8px)] -right-12 z-40 w-[min(360px,calc(100vw-20px))] overflow-hidden rounded-md border border-line-strong bg-surface shadow-pop md:right-0"
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-3 text-[13.5px] font-bold">
            Needs you now
            <button type="button" onClick={markSeen} className="text-[12.5px] font-bold text-accent-text">
              Mark all as seen
            </button>
          </div>
          {items.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => {
                setOpen(false);
                openRecord(i.ref.resource, i.ref.id);
              }}
              className={`flex w-full items-start gap-2.5 px-3.5 py-[9px] text-left hover:bg-surface-2 ${lvl(i.level)}`}
            >
              <Lamp className="mt-1.5" />
              <div>
                <b className="block text-[13.5px] leading-[1.35] font-[650]">{attentionTitle(i, data)}</b>
                <span className="text-[12.5px] text-fg-3">
                  {i.source}, {attentionWhen(i, now)}
                </span>
              </div>
            </button>
          ))}
          {!items.length && <p className="px-3.5 py-[18px] text-[13.5px] text-fg-3">No critical or high items.</p>}
        </div>
      )}
    </div>
  );
}
