/**
 * What just happened, from the user's point of view. The actions, the search,
 * the drawer and the live stream emit these; the greeting avatar turns them into
 * an animation. Semantic on purpose: emitters know nothing about animation keys.
 */
export type Reaction =
  | 'done'
  | 'moved'
  | 'added'
  | 'undone'
  | 'failed'
  | 'working'
  | 'rescheduled'
  | 'unchanged'
  | 'searching'
  | 'opened'
  | 'profile'
  | 'syncing'
  | 'synced'
  | 'syncFailed';

type Listener = (r: Reaction) => void;
const listeners = new Set<Listener>();

export function emitReaction(r: Reaction): void {
  listeners.forEach((l) => l(r));
}

/** Subscribes to reactions; returns the unsubscribe function. */
export function onReaction(l: Listener): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
