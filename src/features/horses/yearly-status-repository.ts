import type { DatabaseConnection } from '@/database/connection';
import { buildInsert, buildUpdate, mapRow } from '@/database/base-repository';
import type { YearlyStatus, YearlyStatusCreateInput, YearlyStatusUpdateInput } from './types';

export interface YearlyStatusRepository {
  findById(id: number): Promise<YearlyStatus | null>;
  findByHorseId(horseId: number): Promise<YearlyStatus[]>;
  create(data: YearlyStatusCreateInput): Promise<YearlyStatus>;
  update(id: number, data: YearlyStatusUpdateInput): Promise<YearlyStatus>;
  delete(id: number): Promise<void>;
}

function mapYearlyStatusRow(row: Record<string, unknown>): YearlyStatus {
  const status = mapRow<YearlyStatus>(row);
  // Parse JSON fields
  const record = status as unknown as Record<string, unknown>;
  for (const field of ['runningStyle', 'traits']) {
    if (typeof record[field] === 'string') {
      try {
        record[field] = JSON.parse(record[field] as string);
      } catch {
        record[field] = null;
      }
    }
  }
  return status;
}

function yearlyStatusToColumns(
  data: YearlyStatusCreateInput | YearlyStatusUpdateInput,
): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if ('horseId' in data && data.horseId !== undefined) columns.horse_id = data.horseId;
  if ('year' in data && data.year !== undefined) columns.year = data.year;
  if (data.spRank !== undefined) columns.sp_rank = data.spRank;
  if (data.spValue !== undefined) columns.sp_value = data.spValue;
  if (data.powerRank !== undefined) columns.power_rank = data.powerRank;
  if (data.powerValue !== undefined) columns.power_value = data.powerValue;
  if (data.instantRank !== undefined) columns.instant_rank = data.instantRank;
  if (data.instantValue !== undefined) columns.instant_value = data.instantValue;
  if (data.staminaRank !== undefined) columns.stamina_rank = data.staminaRank;
  if (data.staminaValue !== undefined) columns.stamina_value = data.staminaValue;
  if (data.mentalRank !== undefined) columns.mental_rank = data.mentalRank;
  if (data.mentalValue !== undefined) columns.mental_value = data.mentalValue;
  if (data.wisdomRank !== undefined) columns.wisdom_rank = data.wisdomRank;
  if (data.wisdomValue !== undefined) columns.wisdom_value = data.wisdomValue;
  if (data.subParams !== undefined) columns.sub_params = data.subParams;
  if (data.turfAptitude !== undefined) columns.turf_aptitude = data.turfAptitude;
  if (data.dirtAptitude !== undefined) columns.dirt_aptitude = data.dirtAptitude;
  if (data.turfQuality !== undefined) columns.turf_quality = data.turfQuality;
  if (data.distanceMin !== undefined) columns.distance_min = data.distanceMin;
  if (data.distanceMax !== undefined) columns.distance_max = data.distanceMax;
  if (data.growthType !== undefined) columns.growth_type = data.growthType;
  if (data.runningStyle !== undefined) {
    columns.running_style = data.runningStyle ? JSON.stringify(data.runningStyle) : null;
  }
  if (data.traits !== undefined) {
    columns.traits = data.traits ? JSON.stringify(data.traits) : null;
  }
  if (data.jockey !== undefined) columns.jockey = data.jockey;
  if (data.grade !== undefined) columns.grade = data.grade;
  if (data.raceRecord !== undefined) columns.race_record = data.raceRecord;
  if (data.notes !== undefined) columns.notes = data.notes;
  return columns;
}

export function createYearlyStatusRepository(db: DatabaseConnection): YearlyStatusRepository {
  return {
    async findById(id: number) {
      const row = await db.get<Record<string, unknown>>(
        'SELECT * FROM yearly_statuses WHERE id = ?',
        [id],
      );
      return row ? mapYearlyStatusRow(row) : null;
    },

    async findByHorseId(horseId: number) {
      const rows = await db.all<Record<string, unknown>>(
        'SELECT * FROM yearly_statuses WHERE horse_id = ? ORDER BY year DESC',
        [horseId],
      );
      return rows.map(mapYearlyStatusRow);
    },

    async create(data: YearlyStatusCreateInput) {
      const columns = yearlyStatusToColumns(data);
      const { sql, params } = buildInsert('yearly_statuses', columns);
      const result = await db.run(sql, params);
      const status = await this.findById(result.lastInsertRowId);
      return status!;
    },

    async update(id: number, data: YearlyStatusUpdateInput) {
      const columns = yearlyStatusToColumns(data);
      if (Object.keys(columns).length === 0) {
        const status = await this.findById(id);
        if (!status) throw new Error(`YearlyStatus not found: id=${id}`);
        return status;
      }
      const { sql, params } = buildUpdate('yearly_statuses', id, columns);
      const result = await db.run(sql, params);
      if (result.changes === 0) throw new Error(`YearlyStatus not found: id=${id}`);
      const status = await this.findById(id);
      return status!;
    },

    async delete(id: number) {
      await db.run('DELETE FROM yearly_statuses WHERE id = ?', [id]);
    },
  };
}
