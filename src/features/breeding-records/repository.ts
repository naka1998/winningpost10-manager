import type { DatabaseConnection } from '@/database/connection';
import { buildInsert, buildUpdate, mapRow } from '@/database/base-repository';
import type {
  BreedingRecordWithNames,
  BreedingRecordCreateInput,
  BreedingRecordUpdateInput,
  BreedingRecordFilter,
} from './types';

export interface BreedingRecordRepository {
  findById(id: number): Promise<BreedingRecordWithNames | null>;
  findAll(filter?: BreedingRecordFilter): Promise<BreedingRecordWithNames[]>;
  create(data: BreedingRecordCreateInput): Promise<BreedingRecordWithNames>;
  update(id: number, data: BreedingRecordUpdateInput): Promise<BreedingRecordWithNames>;
  delete(id: number): Promise<void>;
}

const SELECT_WITH_NAMES = `
  SELECT br.*,
         m.name AS mare_name,
         s.name AS sire_name,
         o.name AS offspring_name
  FROM breeding_records br
  JOIN horses m ON m.id = br.mare_id
  JOIN horses s ON s.id = br.sire_id
  LEFT JOIN horses o ON o.id = br.offspring_id
`;

function mapBreedingRecordRow(row: Record<string, unknown>): BreedingRecordWithNames {
  const record = mapRow<BreedingRecordWithNames & { theoriesJson?: string }>(row);
  if (typeof record.theoriesJson === 'string') {
    record.theories = JSON.parse(record.theoriesJson);
  } else {
    record.theories = record.theoriesJson ?? null;
  }
  delete record.theoriesJson;
  return record as BreedingRecordWithNames;
}

function breedingRecordToColumns(
  data: BreedingRecordCreateInput | BreedingRecordUpdateInput,
): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (data.mareId !== undefined) columns.mare_id = data.mareId;
  if (data.sireId !== undefined) columns.sire_id = data.sireId;
  if (data.year !== undefined) columns.year = data.year;
  if (data.evaluation !== undefined) columns.evaluation = data.evaluation;
  if (data.theories !== undefined) {
    columns.theories_json = data.theories ? JSON.stringify(data.theories) : null;
  }
  if (data.totalPower !== undefined) columns.total_power = data.totalPower;
  if (data.offspringId !== undefined) columns.offspring_id = data.offspringId;
  if (data.notes !== undefined) columns.notes = data.notes;
  return columns;
}

export function createBreedingRecordRepository(db: DatabaseConnection): BreedingRecordRepository {
  return {
    async findById(id: number) {
      const row = await db.get<Record<string, unknown>>(`${SELECT_WITH_NAMES} WHERE br.id = ?`, [
        id,
      ]);
      return row ? mapBreedingRecordRow(row) : null;
    },

    async findAll(filter?: BreedingRecordFilter) {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filter?.mareId !== undefined) {
        conditions.push('br.mare_id = ?');
        params.push(filter.mareId);
      }
      if (filter?.sireId !== undefined) {
        conditions.push('br.sire_id = ?');
        params.push(filter.sireId);
      }
      if (filter?.year !== undefined) {
        conditions.push('br.year = ?');
        params.push(filter.year);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `${SELECT_WITH_NAMES} ${where} ORDER BY br.year DESC, br.id DESC`;
      const rows = await db.all<Record<string, unknown>>(sql, params);
      return rows.map(mapBreedingRecordRow);
    },

    async create(data: BreedingRecordCreateInput) {
      const columns = breedingRecordToColumns(data);
      const { sql, params } = buildInsert('breeding_records', columns);
      const result = await db.run(sql, params);
      const record = await this.findById(result.lastInsertRowId);
      return record!;
    },

    async update(id: number, data: BreedingRecordUpdateInput) {
      const columns = breedingRecordToColumns(data);
      if (Object.keys(columns).length === 0) {
        const record = await this.findById(id);
        if (!record) throw new Error(`BreedingRecord not found: id=${id}`);
        return record;
      }
      const { sql, params } = buildUpdate('breeding_records', id, columns);
      const result = await db.run(sql, params);
      if (result.changes === 0) throw new Error(`BreedingRecord not found: id=${id}`);
      const record = await this.findById(id);
      return record!;
    },

    async delete(id: number) {
      await db.run('DELETE FROM breeding_records WHERE id = ?', [id]);
    },
  };
}
