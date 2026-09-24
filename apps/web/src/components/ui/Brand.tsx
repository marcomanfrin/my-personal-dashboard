import { cn } from '../../lib/cn';
import { LOGO } from './icons';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-[30px] flex-none place-items-center rounded-[9px] bg-accent text-on-accent', className)}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-[18px]">
        {LOGO}
      </svg>
    </span>
  );
}

export function Brand({ className, nameClassName }: { className?: string; nameClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-base font-extrabold tracking-[-.01em]', className)}>
      <BrandMark />
      <span className={nameClassName}>Command</span>
    </div>
  );
}
