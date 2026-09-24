import type { PrState, Priority } from '@command/shared';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { hue, initialsOf } from '../../lib/format';
import { LEVEL_LABEL, STATE_ICON, STATE_LABEL } from '../../lib/labels';
import { Icon } from './Icon';
import type { IconName } from './icons';

/** Utility class that sets --c for a level (lvl-high, ...). */
export const lvl = (level: Priority | 'upcoming') => `lvl-${level}`;

/** A coloured status dot with a soft halo; `pulse` for critical things. */
export function Lamp({ className, pulse }: { className?: string; pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-2 flex-none rounded-full bg-c shadow-[0_0_0_3px_color-mix(in_srgb,var(--c)_18%,transparent)]',
        pulse && 'animate-pulse-lamp',
        className,
      )}
    />
  );
}

const pillBase = 'inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full px-2 text-[11.5px] font-[750]';

/** Tinted label. Colour comes from `className` (lvl-*, st-*), or pass `quiet`. */
export function Pill({ children, className, quiet }: { children: ReactNode; className?: string; quiet?: boolean }) {
  return (
    <span
      className={cn(
        pillBase,
        quiet ? 'border border-line bg-surface-2 text-fg-2' : 'bg-c/13 text-c',
        className,
      )}
    >
      {children}
    </span>
  );
}

export const LevelPill = ({ level, children }: { level: Priority; children?: ReactNode }) => (
  <Pill className={lvl(level)}>{children ?? LEVEL_LABEL[level]}</Pill>
);

export function StateBadge({ state, children }: { state: PrState; children?: ReactNode }) {
  return (
    <Pill className={`st-${state}`}>
      <Icon name={STATE_ICON[state]} size="xs" />
      {children ?? STATE_LABEL[state]}
    </Pill>
  );
}

/** Small grey meta item: icon + text, or a colour swatch + text. */
export function Tag({
  icon,
  swatch,
  children,
  className,
}: {
  icon?: IconName;
  swatch?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-[5px] whitespace-nowrap text-xs font-semibold text-fg-3', className)}>
      {swatch && <span className="size-[7px] rounded-[2px] bg-c" />}
      {icon && <Icon name={icon} size="xs" />}
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'warn';
  size?: 'md' | 'sm';
  icon?: IconName;
  tip?: string;
};

export function Button({ variant = 'default', size = 'md', icon, tip, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      data-tip={tip}
      className={cn(
        'inline-flex items-center justify-center gap-[7px] rounded-[10px] border font-bold',
        size === 'md' ? 'h-[38px] px-3.5 text-[13.5px]' : 'h-8 px-[11px] text-[12.5px]',
        variant === 'primary' && 'border-accent bg-accent text-on-accent hover:brightness-110',
        variant === 'default' && 'border-line-strong bg-surface text-fg hover:bg-surface-2',
        variant === 'warn' && 'border-high/55 bg-surface text-high hover:bg-surface-2',
        'aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-text',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size="sm" />}
      {children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tip?: string };

export function IconButton({ icon, label, tip, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={tip}
      className={cn(
        'relative grid size-[38px] flex-none place-items-center rounded-[10px] text-fg-2 hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
      {children}
    </button>
  );
}

/** Rounded pressable filter pill with an optional count. */
export function Chip({
  pressed,
  count,
  children,
  onClick,
}: {
  pressed: boolean;
  count?: number;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full border px-[11px] text-[12.5px] font-[650]',
        pressed
          ? 'border-fg bg-fg text-canvas'
          : 'border-line bg-surface-2 text-fg-2 hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
      {count !== undefined && <span className="text-[11.5px] opacity-70">{count}</span>}
    </button>
  );
}

export function ChipRail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('scroll-fade -m-0.5 mb-2.5 flex gap-1.5 overflow-x-auto p-0.5', className)}
    >
      {children}
    </div>
  );
}

export interface SegOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  buttonClassName,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex gap-0.5 rounded-[10px] border border-line bg-surface-2 p-[3px]', className)}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            'h-[26px] whitespace-nowrap rounded-[7px] px-2.5 text-[12.5px] font-bold text-fg-3',
            'aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:shadow-[0_1px_3px_rgba(0,0,0,.12)]',
            buttonClassName,
          )}
        >
          {o.label}
          {o.count !== undefined && ` ${o.count}`}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  label = 'Progress',
  height = 'h-1.5',
}: {
  value: number;
  className?: string;
  label?: string;
  height?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('overflow-hidden rounded-full bg-surface-3', height, className)}
    >
      <span className="block h-full rounded-full bg-[var(--c,var(--accent))]" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      className="grid size-9 flex-none place-items-center rounded-[11px] text-[12.5px] font-extrabold"
      style={{
        background: `hsl(${hue(name)} 70% 55% / .15)`,
        color: `hsl(${hue(name)} 60% var(--av-fg-l))`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Empty({ children, as: As = 'li' }: { children: ReactNode; as?: 'li' | 'p' | 'div' }) {
  return (
    <As className="rounded-md border border-dashed border-line-strong px-2.5 py-[22px] text-center text-[13.5px] text-fg-3">
      {children}
    </As>
  );
}

/** "Show all 11" / "Show less" under a truncated list. */
export function ShowMore({
  total,
  shown,
  expanded,
  onToggle,
}: {
  total: number;
  shown: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!(total > shown || expanded)) return null;
  return <LinkButton onClick={onToggle} aria-expanded={expanded}>{expanded ? 'Show less' : `Show all ${total}`}</LinkButton>;
}

export function LinkButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-1 pt-2 text-[13px] font-bold text-accent-text hover:underline', className)}
      {...rest}
    />
  );
}

/** Label/value grid used in drawers. Falsy rows are skipped. */
export function Kv({ rows }: { rows: (readonly [string, ReactNode] | false | null | undefined | 0 | '')[] }) {
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
      {rows.filter(Boolean).map((r) => {
        const [k, v] = r as readonly [string, ReactNode];
        return (
          <div key={k} className="contents">
            <dt className="font-[650] text-fg-3">{k}</dt>
            <dd className="m-0 min-w-0 font-semibold [overflow-wrap:anywhere]">{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-[650] text-fg-2">
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function SrOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
