import { clamp } from '@command/shared';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface Tip {
  text: string;
  x: number;
  y: number;
}

const hoverless = () => window.matchMedia?.('(hover: none)').matches ?? false;
/** Rail tooltips only matter when the sidebar shows icons without labels. */
const isRail = () => window.innerWidth >= 768 && window.innerWidth < 1200;

/**
 * One floating tooltip for the whole app, driven by `data-tip` (always) and
 * `data-tip-rail` (sidebar in icon-only mode). Works on keyboard focus too.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const show = (el: Element) => {
      const rail = el.hasAttribute('data-tip-rail') && !el.hasAttribute('data-tip');
      const t = el.getAttribute('data-tip') || el.getAttribute('data-tip-rail');
      if (!t || hoverless() || (rail && !isRail())) return hide();
      setText(t);
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const tr = box.current?.getBoundingClientRect() ?? { width: 0, height: 0 };
        let x = rail ? r.right + 10 : r.left + r.width / 2 - tr.width / 2;
        let y = rail ? r.top + r.height / 2 - tr.height / 2 : r.top - tr.height - 8;
        if (y < 8) y = r.bottom + 8;
        x = clamp(x, 8, window.innerWidth - tr.width - 8);
        setTip({ text: t, x, y });
      });
    };
    const hide = () => setTip(null);
    const over = (e: Event) => {
      const el = (e.target as Element).closest?.('[data-tip],[data-tip-rail]');
      if (el) show(el);
      else hide();
    };
    const focus = (e: FocusEvent) => {
      const target = e.target as Element;
      const el = target.closest?.('[data-tip],[data-tip-rail]');
      if (el && target.matches(':focus-visible')) show(el);
      else hide();
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('focusin', focus);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('focusin', focus);
      window.removeEventListener('scroll', hide);
    };
  }, []);

  return (
    <div
      ref={box}
      role="tooltip"
      style={{ left: tip?.x ?? -9999, top: tip?.y ?? -9999 }}
      className={cn(
        'pointer-events-none fixed z-80 max-w-[260px] rounded-lg bg-fg px-[9px] py-1.5 text-xs leading-[1.35] font-[650] text-canvas shadow-pop transition-opacity duration-[120ms]',
        tip ? 'opacity-100' : 'opacity-0',
      )}
    >
      {tip?.text ?? text}
    </div>
  );
}
