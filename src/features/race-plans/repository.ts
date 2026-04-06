import type { DatabaseConnection } from '@/database/connection';
import { buildInsert, buildUpdate, mapRow } from '@/database/base-repository';
import type {
  RacePlanWithHorseName,
  RacePlanCreateInput,
  RacePlanUpdateInput,
  RacePlanFilter,
} from './types';

export interface RacePlanRepository {
  findById(id: number): Promise<RacePlanWithHorseName | null>;
  findAll(filter?: RacePlanFilter): Promise<RacePlanWithHorseName[]>;
  findByYear(year: number): Promise<RacePlanWithHorseName[]>;
  create(data: RacePlanCreateInput): Promise<RacePlanWithHorseName>;
  update(id: number, data: RacePlanUpdateInput): Promise<RacePlanWithHorseName>;
  delete(id: number): Promise<void>;
}

const SELECT_WITH_NAMES = `
  SELECT rp.*,
         h.name AS horse_name,
         h.sex AS horse_sex,
         h.birth_year AS horse_birth_year
  FROM race_plans rp
  JOIN horses h ON h.id = rp.horse_id
`;

function mapRacePlanRow(row: Record<string, unknown>): RacePlanWithHorseName {
  return mapRow<RacePlanWithHorseName>(row);
}

function racePlanToColumns(
  data: RacePlanCreateInput | RacePlanUpdateInput,
): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if ('horseId' in data && data.horseId !== undefined) columns.horse_id = data.horseId;
  if ('year' in data && (data as RacePlanCreateInput).year !== undefined)
    columns.year = (data as RacePlanCreateInput).year;
  if (data.country !== undefined) columns.country = data.country;
  if (data.surface !== undefined) columns.surface = data.surface;
  if (data.notes !== undefined) columns.notes = data.notes;
  // classicPath: stored in distance_band, grade is null
  if ('classicPath' in data && data.classicPath) {
    columns.distance_band = data.classicPath;
    if (!('grade' in data)) columns.grade = null;
  } else if (data.distanceBand !== undefined) {
    columns.distance_band = data.distanceBand;
  }
  if (data.grade !== undefined) columns.grade = data.grade;
  return columns;
}

export function createRacePlanRepository(db: DatabaseConnection): RacePlanRepository {
  return {
    async findById(id: number) {
      const row = await db.get<Record<string, unknown>>(`${SELECT_WITH_NAMES} WHERE rp.id = ?`, [
        id,
      ]);
      return row ? mapRacePlanRow(row) : null;
    },

    async findAll(filter?: RacePlanFilter) {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filter?.year !== undefined) {
        conditions.push('rp.year = ?');
        params.push(filter.year);
      }
      if (filter?.horseId !== undefined) {
        conditions.push('rp.horse_id = ?');
        params.push(filter.horseId);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sql = `${SELECT_WITH_NAMES} ${where} ORDER BY rp.year DESC, rp.id DESC`;
      const rows = await db.all<Record<string, unknown>>(sql, params);
      return rows.map(mapRacePlanRow);
    },

    async findByYear(year: number) {
      const sql = `${SELECT_WITH_NAMES} WHERE rp.year = ? ORDER BY rp.id`;
      const rows = await db.all<Record<string, unknown>>(sql, [year]);
      return rows.map(mapRacePlanRow);
    },

    async create(data: RacePlanCreateInput) {
      const columns = racePlanToColumns(data);
      const { sql, params } = buildInsert('race_plans', columns);
      const result = await db.run(sql, params);
      const plan = await this.findById(result.lastInsertRowId);
      return plan!;
    },

    async update(id: number, data: RacePlanUpdateInput) {
      const columns = racePlanToColumns(data);
      if (Object.keys(columns).length === 0) {
        const plan = await this.findById(id);
        if (!plan) throw new Error(`RacePlan not found: id=${id}`);
        return plan;
      }
      const { sql, params } = buildUpdate('race_plans', id, columns);
      const result = await db.run(sql, params);
      if (result.changes === 0) throw new Error(`RacePlan not found: id=${id}`);
      const plan = await this.findById(id);
      return plan!;
    },

    async delete(id: number) {
      await db.run('DELETE FROM race_plans WHERE id = ?', [id]);
    },
  };
}
