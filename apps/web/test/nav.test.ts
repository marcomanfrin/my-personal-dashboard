import { describe, expect, it } from 'vitest';
import { navItems } from '../src/layout/nav';
import { readingOrder } from '../src/layout/sections';

const ids = (visible: string[]) => navItems(visible).map((x) => x.id);

describe('navItems', () => {
  it('follows the board order', () => {
    expect(ids(['gantt', 'mail', 'overview', 'kpis', 'projects'])).toEqual(['gantt', 'mail', 'overview', 'projects']);
  });

  it('puts Overview where the KPIs come first', () => {
    expect(ids(['mail', 'kpis', 'calendar', 'overview'])).toEqual(['mail', 'overview', 'calendar']);
  });

  it('leaves out hidden widgets, Overview included when only the KPIs show', () => {
    expect(ids(['kpis', 'trello'])).toEqual(['trello']);
  });
});

describe('readingOrder', () => {
  it('reads rows top to bottom, left to right, with a little tolerance on the row top', () => {
    const boxes = [
      { id: 'gantt', top: 900, left: 0 },
      { id: 'reminders', top: 502, left: 700 },
      { id: 'github', top: 0, left: 700 },
      { id: 'calendar', top: 500, left: 0 },
      { id: 'mail', top: 0, left: 0 },
    ];
    expect(readingOrder(boxes)).toEqual(['mail', 'github', 'calendar', 'reminders', 'gantt']);
  });
});
