import { z } from 'zod';
import { IsoDate } from './common';

/** Width of a board widget on the 12-column grid. */
export const BoardSpan = z.literal([4, 5, 7, 8, 12]);
export type BoardSpan = z.infer<typeof BoardSpan>;

/** Widget order, the widths the user changed and the hidden widgets. Unknown widget ids are ignored by the web app. */
export const BoardLayout = z.object({
  order: z.array(z.string().max(64)).max(50),
  spans: z.record(z.string().max(64), BoardSpan),
  /** Widgets taken off the board (and out of the navigation); optional for layouts saved before it existed. */
  hidden: z.array(z.string().max(64)).max(50).optional(),
});
export type BoardLayout = z.infer<typeof BoardLayout>;

/**
 * Per-user dashboard settings, kept on the server so they follow the user across
 * browsers and devices. Every key is optional: a missing one means "default".
 */
export const Preferences = z.object({
  board: BoardLayout.optional(),
  /** Collapsed widgets, by section id. */
  collapsed: z.record(z.string().max(64), z.boolean()).optional(),
  /** Sidebar reduced to the icon rail (from 1200px). */
  sidebarCollapsed: z.boolean().optional(),
});
export type Preferences = z.infer<typeof Preferences>;

/** PATCH body: the given top-level keys replace the stored ones, the others stay. */
export const PreferencesPatch = Preferences.strict();
export type PreferencesPatch = z.infer<typeof PreferencesPatch>;

export const PreferencesResponse = z.object({
  preferences: Preferences,
  /** Null until the user saves something. */
  updatedAt: IsoDate.nullable(),
});
export type PreferencesResponse = z.infer<typeof PreferencesResponse>;
