import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/primitives';
import type { IconName } from '../components/ui/icons';
import { useDrawer } from './DrawerContext';

export interface DrawerViewProps {
  kickerIcon: IconName;
  kicker: ReactNode;
  title: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}

/** Content layout of a drawer: kicker + title header, scrolling body, action footer. */
export function DrawerView({ kickerIcon, kicker, title, children, foot }: DrawerViewProps) {
  return (
    <>
      <div className="flex items-start gap-3 border-b border-line px-[18px] pt-[18px] pb-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-fg-3">
            <Icon name={kickerIcon} size="xs" />
            {kicker}
          </p>
          <h2 id="drawer-title" className="mt-1 text-lg leading-[1.3] font-extrabold tracking-[-.01em]">
            {title}
          </h2>
        </div>
        <DrawerCloseButton />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-4">{children}</div>
      {foot && <footer className="flex flex-wrap gap-2 border-t border-line px-[18px] pt-3 pb-4">{foot}</footer>}
    </>
  );
}

function DrawerCloseButton() {
  const { close } = useDrawer();
  return <IconButton icon="x" label="Close details" data-drawer-close onClick={close} />;
}

/** Bottom sheet on phones, right-side panel from 768px. Traps focus, closes on Esc or backdrop. */
export function DrawerShell({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('[data-drawer-close]')?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ].filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 animate-fade bg-[var(--scrim)]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={
          'absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-sheet flex-col rounded-t-[20px] border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-pop ' +
          'md:top-0 md:left-auto md:max-h-none md:w-[min(460px,92vw)] md:animate-slide md:rounded-none md:border-t-0 md:border-l md:pt-[env(safe-area-inset-top,0px)]'
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Section heading inside a drawer body. */
export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[12.5px] font-[750] text-fg-3">{title}</h3>
      {children}
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="text-sm leading-relaxed whitespace-pre-line text-fg-2">{children}</div>;
}

export function CheckRow({ className, icon, children }: { className?: string; icon: IconName; children: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 text-[13px] [&+&]:border-t [&+&]:border-line ${className ?? ''}`}>
      <Icon name={icon} size="sm" className="text-c" />
      {children}
    </div>
  );
}
