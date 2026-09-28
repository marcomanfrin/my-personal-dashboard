import { createAvatar, type CreatedAvatarProps } from '@bible-strong/avatar-react';
import '@bible-strong/avatar-react/styles.css';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { onReaction, type Reaction } from '../lib/reactions';
import { lookAt, novaDefinition, type LookKey } from './nova';

// The definition is validated once here.
const NovaAvatar = createAvatar(novaDefinition);
type Animation = NonNullable<CreatedAvatarProps<typeof novaDefinition>['animation']>;

const ANIMATION: Record<Reaction, Animation> = {
  done: 'happy',
  moved: 'working',
  added: 'proud',
  undone: 'confused',
  failed: 'sad',
  working: 'thinking',
  rescheduled: 'proud',
  unchanged: 'bored',
  searching: 'searching',
  opened: 'curious',
  profile: 'shy',
  syncing: 'listening',
  synced: 'surprised',
  syncFailed: 'scared',
};
/** Every animation loops, so a reaction lasts this long before going back to rest. */
const REACTION_MS = 3200;
const LONG_MS = 5000;
/** The head follows the cursor until it has been still this long. */
const GAZE_MS = 4000;

/** Streaks turn a reaction into a stronger one: [window, count] within it. */
const DONE_STREAK = { ms: 60_000, count: 3 };
const FAIL_STREAK = { ms: 30_000, count: 2 };
const UNDO_STREAK = { ms: 10_000, count: 2 };
const POKE_STREAK = { ms: 1500, count: 3 };

/** Minutes without input before each resting mood. */
const BORED_MIN = 3;
const DROWSY_MIN = 8;
const ASLEEP_MIN = 15;
const TICK_MS = 15_000;
const SLEEPY: Animation[] = ['drowsy', 'sleeping'];

const SIZE = 'clamp(52px,12vw,72px)';
const DOCKED_SIZE = 56;

/** The mood with nothing happening: time of day, how long the user has been away, what is pending. */
export function restFor(hour: number, idleMin: number, critical: number): Animation {
  const night = hour < 6;
  const late = hour >= 22;
  if (idleMin >= ASLEEP_MIN || (night && idleMin >= 1)) return 'sleeping';
  if (idleMin >= DROWSY_MIN || (late && idleMin >= 1)) return 'drowsy';
  if (idleMin >= BORED_MIN) return 'bored';
  return critical > 0 ? 'listening' : 'idle';
}

/** Records `t` in `times` and tells whether the streak is reached. */
function streak(times: number[], t: number, { ms, count }: { ms: number; count: number }): boolean {
  times.push(t);
  while (times.length && times[0]! < t - ms) times.shift();
  return times.length >= count;
}

/**
 * Nova, next to the greeting. Reacts to what the user and the agents do, follows
 * the mouse when nothing is happening, and rests in a mood that depends on the
 * time and on how long the user has been away. Click her for a laugh.
 */
export function GreetingAvatar({ pressing, critical, hour }: { pressing: number; critical: number; hour: number }) {
  const [reaction, setReaction] = useState<{ animation: Animation; ms: number; seq: number } | null>(null);
  const [gaze, setGaze] = useState<LookKey | null>(null);
  const [idleMin, setIdleMin] = useState(0);
  const [docked, setDocked] = useState(false);
  const slot = useRef<HTMLSpanElement>(null);
  const el = useRef<HTMLSpanElement>(null);
  const history = useRef({ done: [] as number[], failed: [] as number[], undone: [] as number[], poke: [] as number[] });
  const lastInput = useRef(Date.now());

  const play = (animation: Animation, ms = REACTION_MS) =>
    setReaction((r) => ({ animation, ms, seq: (r?.seq ?? 0) + 1 }));

  useEffect(
    () =>
      onReaction((r) => {
        const t = Date.now();
        const h = history.current;
        if (r === 'done' && streak(h.done, t, DONE_STREAK)) return play('excited', LONG_MS);
        if (r === 'failed' && streak(h.failed, t, FAIL_STREAK)) return play('angry');
        if (r === 'undone' && streak(h.undone, t, UNDO_STREAK)) return play('suspicious');
        play(ANIMATION[r]);
      }),
    [],
  );

  // Back to rest once the reaction has had its moment; a new reaction restarts the clock.
  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => setReaction(null), reaction.ms);
    return () => clearTimeout(t);
  }, [reaction]);

  // The user (not an agent sync) just cleared the last pressing item.
  const prevPressing = useRef(pressing);
  useEffect(() => {
    const cleared = prevPressing.current > 0 && pressing === 0;
    if (cleared && (reaction?.animation === 'happy' || reaction?.animation === 'excited')) play('celebrate', LONG_MS);
    prevPressing.current = pressing;
  }, [pressing, reaction]);

  const rest = restFor(hour, idleMin, critical);

  // Any input resets the away clock, and wakes her up if she was dozing off.
  const restRef = useRef(rest);
  restRef.current = rest;
  const active = () => {
    lastInput.current = Date.now();
    setIdleMin(0);
    if (SLEEPY.includes(restRef.current)) {
      restRef.current = 'idle';
      play('waking', 2800);
    }
  };
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setIdleMin(Math.floor((Date.now() - lastInput.current) / 60_000));
    };
    const id = setInterval(tick, TICK_MS);
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, active, { passive: true }));
    return () => {
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, active));
    };
  }, []);

  // Follow the mouse (not touch: a finger on the screen is not somewhere to look).
  useEffect(() => {
    let frame = 0;
    let still: ReturnType<typeof setTimeout> | undefined;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        active();
        const box = el.current?.getBoundingClientRect();
        if (!box) return;
        setGaze(lookAt(e.clientX - (box.left + box.width / 2), e.clientY - (box.top + box.height / 2)));
      });
      clearTimeout(still);
      still = setTimeout(() => setGaze(null), GAZE_MS);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(still);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  // Scrolled past the greeting (under the sticky topbar): float in a corner so she stays in sight.
  useEffect(() => {
    if (!slot.current || typeof IntersectionObserver === 'undefined') return;
    const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 60;
    const io = new IntersectionObserver(([entry]) => setDocked(!entry!.isIntersecting && entry!.boundingClientRect.top < topbar), {
      rootMargin: `-${topbar}px 0px 0px 0px`,
    });
    io.observe(slot.current);
    return () => io.disconnect();
  }, []);

  const poke = () => play(streak(history.current.poke, Date.now(), POKE_STREAK) ? 'laughing' : 'playful');

  const animation: Animation = reaction?.animation ?? gaze ?? rest;
  // One avatar that moves between its slot and the corner, so a reaction in progress carries on.
  return (
    <span ref={slot} aria-hidden="true" className="grid flex-none" style={{ width: SIZE, height: SIZE }}>
      <span
        ref={el}
        data-animation={animation}
        data-docked={docked || undefined}
        onClick={poke}
        className={cn(
          'cursor-pointer',
          docked &&
            'fixed right-4 bottom-[calc(var(--bottomnav-h)+env(safe-area-inset-bottom,0px)+14px)] z-40 grid animate-sheet place-items-center rounded-full border border-line bg-surface p-1 shadow-pop md:right-6 md:bottom-6',
        )}
      >
        <NovaAvatar animation={animation} size={docked ? DOCKED_SIZE : SIZE} />
      </span>
    </span>
  );
}
