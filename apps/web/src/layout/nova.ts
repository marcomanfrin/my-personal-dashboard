import nova from '../assets/nova.avatar.json';

/**
 * Nova's definition from avatars.bible-strong.app, plus a grid of "look" poses
 * generated from `neutral`, so she can turn her head toward the cursor.
 * Each pose is also a one-step looping animation that keeps the idle blink.
 */

/** Head yaw per column, degrees: positive looks right. */
const YAW = [-30, -15, 0, 15, 30] as const;
/** Head pitch per row, degrees: positive looks up. */
const PITCH = [8, 0, -12] as const;

type Row = 0 | 1 | 2;
type Col = 0 | 1 | 2 | 3 | 4;
export type LookKey = `look-${Row}-${Col}`;

const looks = PITCH.flatMap((x, r) =>
  YAW.map((y, c) => ({ key: `look-${r}-${c}` as LookKey, head: { x, y, z: -y / 4 } })),
);
const keys = looks.map((l) => l.key);

export const novaDefinition = {
  ...nova,
  expressions: {
    ...nova.expressions,
    ...Object.fromEntries(looks.map(({ key, head }) => [key, { ...nova.expressions.neutral, head }])),
  } as typeof nova.expressions & Record<LookKey, typeof nova.expressions.neutral>,
  animations: {
    ...nova.animations,
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        {
          playbackMode: 'loop',
          steps: [{ expression: key, transitionMs: 350, holdMs: 60_000, transition: 'smooth' }],
          blink: nova.animations.idle.blink,
          metadata: { label: key, description: 'Looks toward the cursor.', group: 'Gaze' },
        },
      ]),
    ),
  } as typeof nova.animations & Record<LookKey, typeof nova.animations.idle>,
  expressionOrder: [...nova.expressionOrder, ...keys],
  animationOrder: [...nova.animationOrder, ...keys],
};

/**
 * The pose that looks at a point `dx`, `dy` pixels from the avatar's center
 * (screen axes: positive `dy` is below). Coarse on purpose: a new pose only when
 * the cursor crosses a band, so the head turns in a few calm steps.
 */
export function lookAt(dx: number, dy: number): LookKey {
  const col: Col = dx < -420 ? 0 : dx < -120 ? 1 : dx <= 120 ? 2 : dx <= 420 ? 3 : 4;
  const row: Row = dy < -40 ? 0 : dy <= 160 ? 1 : 2;
  return `look-${row}-${col}`;
}
