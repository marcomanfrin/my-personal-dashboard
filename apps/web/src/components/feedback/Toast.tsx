import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  undo?: () => void;
  tone: 'default' | 'error';
}

interface ToastApi {
  show(message: string, undo?: () => void): void;
  error(message: string): void;
}

const Ctx = createContext<ToastApi | null>(null);
/** Long enough to reach Undo from the keyboard (WCAG 2.2.1); paused while hovered or focused. */
const DURATION_MS = 10_000;

const isTyping = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '');

/** One toast at a time, bottom centre, with an optional Undo (also Ctrl/Cmd+Z). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [paused, setPaused] = useState(false);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: ToastItem['tone'], undo?: () => void) => {
    setToast({ id: ++seq.current, message, undo, tone });
  }, []);
  const api = useRef<ToastApi>({
    show: (m, undo) => push(m, 'default', undo),
    error: (m) => push(m, 'error'),
  }).current;

  useEffect(() => {
    if (!toast || paused) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), DURATION_MS);
    return () => clearTimeout(t);
  }, [toast, paused]);

  const undo = useCallback(() => {
    toast?.undo?.();
    setToast(null);
    setPaused(false);
  }, [toast]);

  useEffect(() => {
    if (!toast?.undo) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTyping()) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toast, undo]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite">
        {toast && (
          <div
            role={toast.tone === 'error' ? 'alert' : 'status'}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={
              'fixed bottom-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom,0px)+14px)] left-1/2 z-70 flex max-w-[calc(100vw-24px)] -translate-x-1/2 animate-sheet items-center gap-3.5 rounded-md py-2.5 pr-2.5 pl-4 text-[13.5px] font-[650] shadow-pop md:bottom-6 ' +
              (toast.tone === 'error' ? 'bg-crit text-white' : 'bg-fg text-canvas')
            }
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                aria-keyshortcuts="Control+Z Meta+Z"
                className="rounded-lg bg-canvas/16 px-2.5 py-1.5 font-extrabold text-canvas"
                onClick={undo}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
