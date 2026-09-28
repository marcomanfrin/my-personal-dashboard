import { validateAvatarDefinition } from '@bible-strong/avatar-core';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GreetingAvatar, restFor } from '../src/layout/GreetingAvatar';
import { lookAt, novaDefinition } from '../src/layout/nova';
import { emitReaction } from '../src/lib/reactions';

const animation = () => document.querySelector('[data-animation]')?.getAttribute('data-animation');
const avatar = (props: Partial<{ pressing: number; critical: number; hour: number }> = {}) => (
  <GreetingAvatar pressing={2} critical={0} hour={10} {...props} />
);
/** A mouse move to (x, y); jsdom's avatar box sits at the origin. */
const mouseTo = (x: number, y: number, pointerType = 'mouse') => {
  const e = new MouseEvent('pointermove', { clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  act(() => {
    window.dispatchEvent(e);
    vi.advanceTimersToNextFrame();
  });
};

const FAKED = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;
beforeEach(() => vi.useFakeTimers({ toFake: [...FAKED] }));
afterEach(() => vi.useRealTimers());

describe('nova definition', () => {
  it('stays a valid avatar definition with the generated look poses', () => {
    expect(validateAvatarDefinition(novaDefinition).ok).toBe(true);
    expect(novaDefinition.animations['look-1-2']).toBeTruthy();
  });

  it('maps the cursor to a coarse pose', () => {
    expect(lookAt(0, 0)).toBe('look-1-2');
    expect(lookAt(600, 400)).toBe('look-2-4');
    expect(lookAt(-200, -100)).toBe('look-0-1');
  });
});

describe('restFor', () => {
  it('depends on the time, on how long the user has been away, and on critical items', () => {
    expect(restFor(10, 0, 0)).toBe('idle');
    expect(restFor(10, 0, 1)).toBe('listening');
    expect(restFor(10, 3, 0)).toBe('bored');
    expect(restFor(10, 8, 0)).toBe('drowsy');
    expect(restFor(10, 15, 0)).toBe('sleeping');
    expect(restFor(23, 1, 0)).toBe('drowsy');
    expect(restFor(3, 1, 0)).toBe('sleeping');
  });
});

describe('GreetingAvatar', () => {
  it('rests, reacts to an action, then goes back to rest', () => {
    render(avatar());
    expect(animation()).toBe('idle');

    act(() => emitReaction('done'));
    expect(animation()).toBe('happy');

    act(() => vi.advanceTimersByTime(3200));
    expect(animation()).toBe('idle');
  });

  it('restarts the clock when a new reaction arrives', () => {
    render(avatar());
    act(() => emitReaction('done'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => emitReaction('opened'));
    act(() => vi.advanceTimersByTime(2000));
    expect(animation()).toBe('curious');
    act(() => vi.advanceTimersByTime(1200));
    expect(animation()).toBe('idle');
  });

  it('turns streaks into stronger reactions', () => {
    render(avatar());
    act(() => emitReaction('done'));
    act(() => emitReaction('done'));
    act(() => emitReaction('done'));
    expect(animation()).toBe('excited');

    act(() => emitReaction('failed'));
    expect(animation()).toBe('sad');
    act(() => emitReaction('failed'));
    expect(animation()).toBe('angry');
  });

  it('celebrates when the user clears the last pressing item', () => {
    const { rerender } = render(avatar({ pressing: 1 }));
    act(() => emitReaction('done'));
    rerender(avatar({ pressing: 0 }));
    expect(animation()).toBe('celebrate');
  });

  it('does not celebrate when a sync clears the list without a user action', () => {
    const { rerender } = render(avatar({ pressing: 1 }));
    rerender(avatar({ pressing: 0 }));
    expect(animation()).toBe('idle');
  });

  it('follows the mouse while nothing happens, then looks back ahead', () => {
    render(avatar());
    mouseTo(600, 400);
    expect(animation()).toBe('look-2-4');

    // A reaction wins over the gaze.
    act(() => emitReaction('done'));
    expect(animation()).toBe('happy');

    act(() => vi.advanceTimersByTime(4000));
    expect(animation()).toBe('idle');
  });

  it('ignores touch pointers', () => {
    render(avatar());
    mouseTo(600, 400, 'touch');
    expect(animation()).toBe('idle');
  });

  it('dozes off when the user is away and wakes up on input', () => {
    render(avatar());
    // Jump the clock instead of running every frame in between, then let one tick notice.
    const away = (min: number) =>
      act(() => {
        vi.setSystemTime(Date.now() + min * 60_000);
        vi.advanceTimersByTime(15_000);
      });
    away(3);
    expect(animation()).toBe('bored');
    away(5);
    expect(animation()).toBe('drowsy');

    fireEvent.keyDown(window);
    expect(animation()).toBe('waking');
  });

  it('floats in a corner once the greeting scrolls under the topbar, and goes back when it returns', () => {
    let notify: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          notify = cb;
        }
        observe() {}
        disconnect() {}
      },
    );
    const scrolled = (isIntersecting: boolean, top: number) =>
      act(() => notify([{ isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry], {} as never));
    render(avatar());
    const docked = () => document.querySelector('[data-animation]')!.hasAttribute('data-docked');

    scrolled(false, -40);
    expect(docked()).toBe(true);
    act(() => emitReaction('done'));
    expect(animation()).toBe('happy');

    scrolled(true, 80);
    expect(docked()).toBe(false);
    // Below the fold (e.g. a short window): not docked either.
    scrolled(false, 900);
    expect(docked()).toBe(false);
    vi.stubGlobal('IntersectionObserver', undefined); // jsdom has none
  });

  it('plays when poked, laughs when poked again and again', () => {
    render(avatar());
    const el = document.querySelector('[data-animation]')!;
    fireEvent.click(el);
    expect(animation()).toBe('playful');
    fireEvent.click(el);
    fireEvent.click(el);
    expect(animation()).toBe('laughing');
  });
});
