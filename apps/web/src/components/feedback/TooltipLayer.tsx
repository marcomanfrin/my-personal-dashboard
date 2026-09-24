import { clamp } from '@argus/shared';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface Tip {
  text: string;
  x: number;
  y: number;
}

const hoverless = () => window.matchMedia?.('(hover: none)').matches ?? false;
/** Rail tooltips only matter when the sidebar shows icons without labels (tablets, or collapsed). */
const isRail = () =>
  window.innerWidth >= 768 && (window.innerWidth < 1200 || document.documentElement.dataset.sidebar === 'collapsed');

/** Grace period to move the pointer from the element onto the tooltip (WCAG 1.4.13, hoverable). */
const HIDE_DELAY_MS = 150;

/**
 * One floating tooltip for the whole app, driven by `data-tip` (always) and
 * `data-tip-rail` (sidebar in icon-only mode). Works on keyboard focus too, stays
 * while hovered and closes on Esc. It is visual only: the element itself must carry
 * the same information in its accessible name.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const show = (el: Element) => {
      clearTimeout(hideTimer);
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
    const hide = () => {
      clearTimeout(hideTimer);
      setTip(null);
    };
    const over = (e: Event) => {
      const target = e.target as Element;
      if (box.current?.contains(target)) return clearTimeout(hideTimer);
      const el = target.closest?.('[data-tip],[data-tip-rail]');
      if (el) show(el);
      else {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setTip(null), HIDE_DELAY_MS);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    const focus = (e: FocusEvent) => {
      const target = e.target as Element;
      const el = target.closest?.('[data-tip],[data-tip-rail]');
      if (el && target.matches(':focus-visible')) show(el);
      else hide();
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('focusin', focus);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener('keydown', key);
      document.removeEventListener('mouseover', over);
      document.removeEventListener('focusin', focus);
      window.removeEventListener('scroll', hide);
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden="true"
      style={{ left: tip?.x ?? -9999, top: tip?.y ?? -9999 }}
      className={cn(
        'fixed z-80 max-w-[260px] rounded-lg bg-fg px-[9px] py-1.5 text-xs leading-[1.35] font-[650] text-canvas shadow-pop transition-opacity duration-[120ms]',
        tip ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {/* `text` stays while hidden: it sizes the box before the first placement. */}
      {tip?.text ?? text}
    </div>
  );
}
