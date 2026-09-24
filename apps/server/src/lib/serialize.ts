import { getTableColumns, type Table } from 'drizzle-orm';

type Row = Record<string, unknown>;

/** Replaces Date values with ISO strings: the wire format of every DTO. */
export function toDto<T>(row: Row): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out as T;
}

const dateColumnsCache = new WeakMap<Table, Set<string>>();

/** Keys of the timestamp columns of a table, i.e. the fields that are ISO strings on the wire. */
export function dateColumns(table: Table): Set<string> {
  let keys = dateColumnsCache.get(table);
  if (!keys) {
    keys = new Set(
      Object.entries(getTableColumns(table))
        .filter(([, c]) => c.dataType === 'date')
        .map(([k]) => k),
    );
    dateColumnsCache.set(table, keys);
  }
  return keys;
}

/** Converts ISO strings of timestamp columns to Date for writing. Unknown keys are dropped. */
export function toRow(table: Table, dto: Row): Row {
  const columns = getTableColumns(table);
  const dates = dateColumns(table);
  const out: Row = {};
  for (const [k, v] of Object.entries(dto)) {
    if (!(k in columns) || v === undefined) continue;
    out[k] = dates.has(k) && typeof v === 'string' ? new Date(v) : v;
  }
  return out;
}
