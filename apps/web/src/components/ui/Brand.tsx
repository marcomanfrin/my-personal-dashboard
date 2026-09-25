import { cn } from '../../lib/cn';

/** The Argus logo (apps/web/public/logo.png): a watchman with many eyes. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      width={30}
      height={30}
      draggable={false}
      className={cn('size-[30px] flex-none select-none', className)}
    />
  );
}

export function Brand({ className, nameClassName }: { className?: string; nameClassName?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-base font-extrabold tracking-[-.01em]', className)}>
      <BrandMark />
      <span className={nameClassName}>Argus</span>
    </div>
  );
}
