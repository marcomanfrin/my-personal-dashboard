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
const DURATION_MS = 4500;

/** One toast at a time, bottom centre, with an optional Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const seq = useRef(0);

  const push = useCallback((message: string, tone: ToastItem['tone'], undo?: () => void) => {
    setToast({ id: ++seq.current, message, undo, tone });
  }, []);
  const api = useRef<ToastApi>({
    show: (m, undo) => push(m, 'default', undo),
    error: (m) => push(m, 'error'),
  }).current;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), DURATION_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite">
        {toast && (
          <div
            role="status"
            className={
              'fixed bottom-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom,0px)+14px)] left-1/2 z-70 flex max-w-[calc(100vw-24px)] -translate-x-1/2 animate-sheet items-center gap-3.5 rounded-md py-2.5 pr-2.5 pl-4 text-[13.5px] font-[650] shadow-pop md:bottom-6 ' +
              (toast.tone === 'error' ? 'bg-crit text-white' : 'bg-fg text-canvas')
            }
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                className="rounded-lg bg-canvas/16 px-2.5 py-1.5 font-extrabold text-canvas"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
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
