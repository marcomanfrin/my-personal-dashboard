import type { KpiId } from '@argus/shared';
import { Icon } from '../../components/ui/Icon';
import type { IconName } from '../../components/ui/icons';
import { Lamp, lvl } from '../../components/ui/primitives';
import { LEVEL_LABEL } from '../../lib/labels';
import { useDashboard } from '../../hooks/useDashboard';
import { useSections } from '../../layout/sections';
import { cn } from '../../lib/cn';

const KPI_TEXT: Record<KpiId, { label: string; sub?: string; icon: IconName }> = {
  tasks: { label: 'Tasks due today', icon: 'checkSquare' },
  mail: { label: 'Emails to act on', icon: 'mail' },
  prs: { label: 'PRs to review', icon: 'pr' },
  meet: { label: 'Meetings', sub: 'next 24h', icon: 'calendar' },
  overdue: { label: 'Overdue', sub: 'tasks and plan', icon: 'flag' },
  proj: { label: 'Active projects', icon: 'folder' },
};

/** Today at a glance: six tiles, each a shortcut to its section. */
export function KpiGrid({ className }: { className?: string }) {
  const { insights } = useDashboard();
  const { goTo } = useSections();
  return (
    <section id="kpis" aria-label="Today at a glance" className={cn('grid content-start grid-cols-2 gap-2.5 ms:grid-cols-3', className)}>
      {insights.kpis.map((k) => {
        const t = KPI_TEXT[k.id];
        return (
          <a
            key={k.id}
            href={`#${k.target}`}
            onClick={(e) => {
              e.preventDefault();
              goTo(k.target);
            }}
            aria-label={`${k.value} ${t.label}${t.sub ? `, ${t.sub}` : ''}${k.level ? `, ${LEVEL_LABEL[k.level].toLowerCase()} priority` : ''}. Go to section`}
            className={cn(
              'relative isolate flex min-h-[104px] flex-col justify-between gap-2.5 overflow-hidden rounded-[15px] border border-line bg-surface p-3.5 shadow-card hover:border-line-strong',
              k.level &&
                `${lvl(k.level)} before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(160px_110px_at_100%_0%,color-mix(in_srgb,var(--c)_22%,transparent),transparent_70%)] before:content-['']`,
            )}
          >
            <span className="flex items-center justify-between text-fg-3">
              <Icon name={t.icon} size="sm" className={k.level ? 'text-c' : undefined} />
              {k.level && <Lamp />}
            </span>
            <span className="text-[32px] leading-none font-extrabold tracking-[-.04em]">{k.value}</span>
            <span className="text-[12.5px] leading-[1.3] font-[650] text-fg-2">
              {t.label}
              {t.sub && <small className="block text-[11.5px] font-semibold text-fg-3">{t.sub}</small>}
            </span>
          </a>
        );
      })}
    </section>
  );
}
