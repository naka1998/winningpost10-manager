import type { DatabaseConnection } from './connection';

const BACKUP_FILE_PREFIX = 'wp10-manager-backup';
const BACKUP_FILE_EXTENSION = 'json';

interface EncodedBlob {
  __type: 'blob';
  base64: string;
}

type EncodedValue = string | number | boolean | null | EncodedBlob;

interface SerializedTable {
  name: string;
  createSql: string;
  rows: Record<string, EncodedValue>[];
}

interface SerializedSchemaObject {
  type: 'index' | 'trigger' | 'view';
  name: string;
  sql: string;
}

interface DatabaseSnapshot {
  format: 'wp10-manager-backup-v1';
  exportedAt: string;
  schemaVersion: number;
  tables: SerializedTable[];
  schemaObjects: SerializedSchemaObject[];
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeValue(value: unknown): EncodedValue {
  if (value instanceof Uint8Array) {
    return { __type: 'blob', base64: toBase64(value) };
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  if (value === undefined) {
    return null;
  }
  throw new Error(`Unsupported value type in backup: ${typeof value}`);
}

function decodeValue(value: EncodedValue): unknown {
  if (typeof value === 'object' && value !== null && '__type' in value && value.__type === 'blob') {
    return fromBase64(value.base64);
  }
  return value;
}

function formatDatePart(date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function formatTimePart(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}${mm}${ss}`;
}

function isDatabaseSnapshot(value: unknown): value is DatabaseSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DatabaseSnapshot>;
  return (
    candidate.format === 'wp10-manager-backup-v1' &&
    typeof candidate.schemaVersion === 'number' &&
    Array.isArray(candidate.tables) &&
    Array.isArray(candidate.schemaObjects)
  );
}

function validateSnapshot(snapshot: DatabaseSnapshot): void {
  const isSingleStatement = (sql: string): boolean => {
    const trimmed = sql.trim();
    if (trimmed.length === 0) return false;
    const withoutTrailing = trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
    return !withoutTrailing.includes(';');
  };
  const isSingleStatementForSchemaObject = (
    type: SerializedSchemaObject['type'],
    sql: string,
  ): boolean => {
    if (type === 'trigger') {
      // Trigger bodies include semicolons; ensure the SQL is a single CREATE TRIGGER ... END statement.
      return /^\s*CREATE\s+TRIGGER[\s\S]*\bEND\s*;?\s*$/i.test(sql);
    }
    return isSingleStatement(sql);
  };

  if (snapshot.tables.length === 0) {
    throw new Error('バックアップにテーブル定義が含まれていません。');
  }

  for (const table of snapshot.tables) {
    if (typeof table.name !== 'string' || table.name.length === 0) {
      throw new Error('バックアップ内に不正なテーブル名があります。');
    }
    if (
      typeof table.createSql !== 'string' ||
      !table.createSql.trim().toUpperCase().startsWith('CREATE TABLE') ||
      !isSingleStatement(table.createSql)
    ) {
      throw new Error(`バックアップ内のテーブル定義が不正です: ${table.name}`);
    }
    if (!Array.isArray(table.rows)) {
      throw new Error(`バックアップ内のテーブル行データが不正です: ${table.name}`);
    }
  }

  for (const schemaObject of snapshot.schemaObjects) {
    const normalizedSql = schemaObject.sql.trim().toUpperCase();
    const expectedPrefixes: Record<SerializedSchemaObject['type'], string[]> = {
      index: ['CREATE INDEX', 'CREATE UNIQUE INDEX'],
      trigger: ['CREATE TRIGGER'],
      view: ['CREATE VIEW'],
    };
    const isExpectedCreate = expectedPrefixes[schemaObject.type]?.some((prefix) =>
      normalizedSql.startsWith(prefix),
    );
    const includesDeclaredName = normalizedSql.includes(schemaObject.name.toUpperCase());

    if (
      !['index', 'trigger', 'view'].includes(schemaObject.type) ||
      typeof schemaObject.name !== 'string' ||
      schemaObject.name.length === 0 ||
      typeof schemaObject.sql !== 'string' ||
      schemaObject.sql.trim().length === 0 ||
      !isExpectedCreate ||
      !includesDeclaredName ||
      !isSingleStatementForSchemaObject(schemaObject.type, schemaObject.sql)
    ) {
      throw new Error('バックアップ内のスキーマオブジェクト定義が不正です。');
    }
  }
}

async function createSnapshot(db: DatabaseConnection): Promise<DatabaseSnapshot> {
  const versionRow = await db.get<{ value: string }>(
    "SELECT value FROM game_settings WHERE key = 'db_version'",
  );
  const schemaVersion = Number(versionRow?.value ?? 0);
  if (!Number.isInteger(schemaVersion) || schemaVersion <= 0) {
    throw new Error('スキーマバージョンを取得できないためバックアップを中止しました。');
  }

  const tables = await db.all<{ name: string; sql: string }>(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  const serializedTables: SerializedTable[] = [];
  const schemaObjects = await db.all<SerializedSchemaObject>(`
    SELECT type, name, sql
    FROM sqlite_master
    WHERE type IN ('index', 'trigger', 'view')
      AND sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
    ORDER BY
      CASE type
        WHEN 'view' THEN 1
        WHEN 'index' THEN 2
        WHEN 'trigger' THEN 3
      END,
      name
  `);

  for (const table of tables) {
    const rows = await db.all<Record<string, unknown>>(`SELECT * FROM "${table.name}"`);
    serializedTables.push({
      name: table.name,
      createSql: table.sql,
      rows: rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, encodeValue(value)])),
      ),
    });
  }

  return {
    format: 'wp10-manager-backup-v1',
    exportedAt: new Date().toISOString(),
    schemaVersion,
    tables: serializedTables,
    schemaObjects,
  };
}

export function createBackupFilename(date = new Date()): string {
  return `${BACKUP_FILE_PREFIX}-${formatDatePart(date)}-${formatTimePart(date)}.${BACKUP_FILE_EXTENSION}`;
}

export async function exportDatabase(
  db: DatabaseConnection,
): Promise<{ blob: Blob; filename: string }> {
  const snapshot = await createSnapshot(db);
  const content = JSON.stringify(snapshot);
  return {
    blob: new Blob([content], { type: 'application/json' }),
    filename: createBackupFilename(),
  };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function getCurrentSchemaVersion(db: DatabaseConnection): Promise<number> {
  const row = await db.get<{ value: string }>(
    "SELECT value FROM game_settings WHERE key = 'db_version'",
  );
  return Number(row?.value ?? 0);
}

async function getCurrentTableSet(db: DatabaseConnection): Promise<Set<string>> {
  const tables = await db.all<{ name: string }>(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);
  return new Set(tables.map((table) => table.name));
}

async function getCurrentSchemaObjectSet(db: DatabaseConnection): Promise<Set<string>> {
  const objects = await db.all<{ type: string; name: string }>(`
    SELECT type, name
    FROM sqlite_master
    WHERE type IN ('index', 'trigger', 'view')
      AND sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `);
  return new Set(objects.map((object) => `${object.type}:${object.name}`));
}

async function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  const buffer = await blob.arrayBuffer();
  return new TextDecoder().decode(buffer);
}

export async function importDatabase(db: DatabaseConnection, file: File): Promise<void> {
  const text = await readBlobText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('バックアップファイルの形式が不正です。');
  }

  if (!isDatabaseSnapshot(parsed)) {
    throw new Error('サポートされていないバックアップ形式です。');
  }
  validateSnapshot(parsed);

  const currentVersion = await getCurrentSchemaVersion(db);
  if (currentVersion !== parsed.schemaVersion) {
    throw new Error(
      `スキーマバージョンが一致しません（現在: v${currentVersion}, バックアップ: v${parsed.schemaVersion}）。`,
    );
  }

  const snapshotTableSet = new Set(parsed.tables.map((table) => table.name));
  const currentTableSet = await getCurrentTableSet(db);
  const missingFromSnapshot = [...currentTableSet].filter((table) => !snapshotTableSet.has(table));
  const unknownInSnapshot = [...snapshotTableSet].filter((table) => !currentTableSet.has(table));
  if (missingFromSnapshot.length > 0 || unknownInSnapshot.length > 0) {
    throw new Error(
      `バックアップのテーブル構成が一致しません（不足: ${missingFromSnapshot.join(', ') || 'なし'}, 余剰: ${unknownInSnapshot.join(', ') || 'なし'}）。`,
    );
  }

  const snapshotSchemaObjectSet = new Set(
    parsed.schemaObjects.map((schemaObject) => `${schemaObject.type}:${schemaObject.name}`),
  );
  const currentSchemaObjectSet = await getCurrentSchemaObjectSet(db);
  const missingSchemaObjects = [...currentSchemaObjectSet].filter(
    (objectKey) => !snapshotSchemaObjectSet.has(objectKey),
  );
  const unknownSchemaObjects = [...snapshotSchemaObjectSet].filter(
    (objectKey) => !currentSchemaObjectSet.has(objectKey),
  );
  if (missingSchemaObjects.length > 0 || unknownSchemaObjects.length > 0) {
    throw new Error(
      `バックアップのスキーマオブジェクト構成が一致しません（不足: ${missingSchemaObjects.join(', ') || 'なし'}, 余剰: ${unknownSchemaObjects.join(', ') || 'なし'}）。`,
    );
  }

  await db.exec('PRAGMA foreign_keys = OFF;');
  try {
    await db.transaction(async (tx) => {
      const existingObjects = await tx.all<{ type: string; name: string }>(`
      SELECT type, name
      FROM sqlite_master
      WHERE type IN ('table', 'view', 'index', 'trigger')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY
        CASE type
          WHEN 'trigger' THEN 1
          WHEN 'index' THEN 2
          WHEN 'view' THEN 3
          WHEN 'table' THEN 4
        END,
        name
    `);

      for (const object of existingObjects) {
        if (object.type === 'table') {
          await tx.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(object.name)};`);
          continue;
        }
        await tx.exec(
          `DROP ${object.type.toUpperCase()} IF EXISTS ${quoteIdentifier(object.name)};`,
        );
      }

      for (const table of parsed.tables) {
        await tx.exec(table.createSql);
      }

      for (const table of parsed.tables) {
        for (const row of table.rows) {
          const columns = Object.keys(row);
          if (columns.length === 0) continue;

          const placeholders = columns.map(() => '?').join(', ');
          const sql = `INSERT INTO ${quoteIdentifier(table.name)} (${columns
            .map(quoteIdentifier)
            .join(', ')}) VALUES (${placeholders})`;
          const values = columns.map((column) => decodeValue(row[column]));
          await tx.run(sql, values);
        }
      }

      for (const schemaObject of parsed.schemaObjects) {
        await tx.exec(schemaObject.sql);
      }
    });
  } finally {
    await db.exec('PRAGMA foreign_keys = ON;');
  }
}

export async function downloadBackupFile(blob: Blob, filename: string): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
