/**
 * SQL builder helpers for repositories.
 */

export function buildInsert(
  table: string,
  data: Record<string, unknown>,
): { sql: string; params: unknown[] } {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const params = keys.map((k) => data[k] ?? null);
  return { sql, params };
}

export function buildUpdate(
  table: string,
  id: number,
  data: Record<string, unknown>,
): { sql: string; params: unknown[] } {
  const keys = Object.keys(data);
  const setClauses = keys.map((k) => `${k} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`;
  const params = [...keys.map((k) => data[k] ?? null), id];
  return { sql, params };
}

export function buildWhere(filter: Record<string, unknown>): {
  clause: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;
    conditions.push(`${key} = ?`);
    params.push(value);
  }

  if (conditions.length === 0) {
    return { clause: '', params: [] };
  }

  return { clause: `WHERE ${conditions.join(' AND ')}`, params };
}

/** Convert snake_case DB column names to camelCase. */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert camelCase to snake_case for DB columns. */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Convert a snake_case DB row to a camelCase object. */
export function mapRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

/** Convert a camelCase object to snake_case columns, filtering undefined values. */
export function toSnakeColumns(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    result[camelToSnake(key)] = value;
  }
  return result;
}
