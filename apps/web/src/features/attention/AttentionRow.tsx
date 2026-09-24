import type { AttentionItem } from '@command/shared';
import { Icon } from '../../components/ui/Icon';
import { lvl, SrOnly } from '../../components/ui/primitives';
import { useDrawer } from '../../drawer/DrawerContext';
import { useDashboard } from '../../hooks/useDashboard';
import { cn } from '../../lib/cn';
import { ATTENTION_LEVEL_LABEL } from '../../lib/labels';
import { attentionContext, attentionIconFor, attentionTitle, attentionWhen } from './wording';

export function AttentionRow({ item }: { item: AttentionItem }) {
  const { data, now } = useDashboard();
  const { openRecord } = useDrawer();
  return (
    <li className="[&+&]:border-t [&+&]:border-line">
      <button
        type="button"
        onClick={() => openRecord(item.ref.resource, item.ref.id)}
        className={cn(
          '-mx-1.5 flex w-[calc(100%+12px)] items-center gap-3 rounded-[10px] px-1.5 py-2.5 hover:bg-surface-2',
          lvl(item.level),
        )}
      >
        <span className="grid size-[30px] flex-none place-items-center rounded-sm bg-c/12 text-c">
          <Icon name={attentionIconFor(item, data)} size="sm" />
        </span>
        <span className="min-w-0 flex-1">
          <SrOnly>{ATTENTION_LEVEL_LABEL[item.level]}:</SrOnly>
          <b className="block truncate text-sm font-[650]">{attentionTitle(item, data)}</b>
          <span className="block truncate text-[12.5px] text-fg-3">
            {item.source}: {attentionContext(item)}
          </span>
        </span>
        <span className="text-xs font-bold whitespace-nowrap text-c">{attentionWhen(item, now)}</span>
      </button>
    </li>
  );
}
