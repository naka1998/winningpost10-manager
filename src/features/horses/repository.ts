import type { DatabaseConnection } from '@/database/connection';
import { buildInsert, buildUpdate, mapRow } from '@/database/base-repository';
import type { PedigreeRow } from '@/features/pedigree/service';
import type { Horse, HorseCreateInput, HorseFilter, HorseUpdateInput } from './types';

export interface HorseRepository {
  findById(id: number): Promise<Horse | null>;
  findByNameAndBirthYear(name: string, birthYear: number): Promise<Horse | null>;
  findAncestorByName(name: string): Promise<Horse | null>;
  findAll(filter?: HorseFilter): Promise<Horse[]>;
  create(data: HorseCreateInput): Promise<Horse>;
  update(id: number, data: HorseUpdateInput): Promise<Horse>;
  delete(id: number): Promise<void>;
  getAncestorRows(id: number, depth?: number): Promise<PedigreeRow[]>;
}

function mapHorseRow(row: Record<string, unknown>): Horse {
  const horse = mapRow<Horse>(row);
  // Parse JSON fields
  if (typeof horse.factors === 'string') {
    try {
      horse.factors = JSON.parse(horse.factors as unknown as string);
    } catch {
      horse.factors = null;
    }
  }
  // Convert is_historical integer to boolean
  horse.isHistorical = Boolean(horse.isHistorical);
  return horse;
}

function horseToColumns(data: HorseCreateInput | HorseUpdateInput): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (data.name !== undefined) columns.name = data.name;
  if (data.sex !== undefined) columns.sex = data.sex;
  if (data.birthYear !== undefined) columns.birth_year = data.birthYear;
  if (data.country !== undefined) columns.country = data.country;
  if (data.isHistorical !== undefined) columns.is_historical = data.isHistorical ? 1 : 0;
  if (data.mareLine !== undefined) columns.mare_line = data.mareLine;
  if (data.status !== undefined) columns.status = data.status;
  if (data.sireId !== undefined) columns.sire_id = data.sireId;
  if (data.damId !== undefined) columns.dam_id = data.damId;
  if (data.lineageId !== undefined) columns.lineage_id = data.lineageId;
  if (data.factors !== undefined) {
    columns.factors = data.factors ? JSON.stringify(data.factors) : null;
  }
  if (data.notes !== undefined) columns.notes = data.notes;
  return columns;
}

export function createHorseRepository(db: DatabaseConnection): HorseRepository {
  return {
    async findById(id: number) {
      const row = await db.get<Record<string, unknown>>('SELECT * FROM horses WHERE id = ?', [id]);
      return row ? mapHorseRow(row) : null;
    },

    async findByNameAndBirthYear(name: string, birthYear: number) {
      const row = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year = ?',
        [name, birthYear],
      );
      return row ? mapHorseRow(row) : null;
    },

    async findAncestorByName(name: string) {
      const row = await db.get<Record<string, unknown>>(
        'SELECT * FROM horses WHERE name = ? AND birth_year IS NULL LIMIT 1',
        [name],
      );
      return row ? mapHorseRow(row) : null;
    },

    async findAll(filter?: HorseFilter) {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filter?.status) {
        conditions.push('status = ?');
        params.push(filter.status);
      }
      if (filter?.lineageId) {
        conditions.push('lineage_id = ?');
        params.push(filter.lineageId);
      }
      if (filter?.sex) {
        conditions.push('sex = ?');
        params.push(filter.sex);
      }
      if (filter?.birthYearFrom) {
        conditions.push('birth_year >= ?');
        params.push(filter.birthYearFrom);
      }
      if (filter?.birthYearTo) {
        conditions.push('birth_year <= ?');
        params.push(filter.birthYearTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Whitelist sort columns and order to prevent SQL injection
      const sortColumnMap: Record<string, string> = {
        name: 'name',
        birth_year: 'birth_year',
        status: 'status',
      };
      const sortColumn = sortColumnMap[filter?.sortBy ?? 'name'] ?? 'name';
      const sortOrder = filter?.sortOrder === 'desc' ? 'DESC' : 'ASC';
      const sql = `SELECT * FROM horses ${whereClause} ORDER BY ${sortColumn} ${sortOrder}`;

      const rows = await db.all<Record<string, unknown>>(sql, params);
      return rows.map(mapHorseRow);
    },

    async create(data: HorseCreateInput) {
      const columns = horseToColumns(data);
      const { sql, params } = buildInsert('horses', columns);
      const result = await db.run(sql, params);
      const horse = await this.findById(result.lastInsertRowId);
      return horse!;
    },

    async update(id: number, data: HorseUpdateInput) {
      const columns = horseToColumns(data);
      if (Object.keys(columns).length === 0) {
        const horse = await this.findById(id);
        if (!horse) throw new Error(`Horse not found: id=${id}`);
        return horse;
      }
      const { sql, params } = buildUpdate('horses', id, columns);
      const result = await db.run(sql, params);
      if (result.changes === 0) throw new Error(`Horse not found: id=${id}`);
      const horse = await this.findById(id);
      return horse!;
    },

    async delete(id: number) {
      await db.run('DELETE FROM horses WHERE id = ?', [id]);
    },

    async getAncestorRows(id: number, depth: number = 4) {
      const sql = `
        WITH RECURSIVE pedigree AS (
          SELECT
            h.id,
            h.name,
            h.sire_id,
            h.dam_id,
            h.lineage_id,
            h.factors,
            0 AS generation,
            'self' AS position,
            '' AS path
          FROM horses h
          WHERE h.id = ?

          UNION ALL

          SELECT
            parent.id,
            parent.name,
            parent.sire_id,
            parent.dam_id,
            parent.lineage_id,
            parent.factors,
            p.generation + 1,
            CASE WHEN p.position = 'self' THEN 'sire'
                 ELSE p.position || '_sire'
            END,
            p.path || 'S'
          FROM pedigree p
          JOIN horses parent ON parent.id = p.sire_id
          WHERE p.generation < ?

          UNION ALL

          SELECT
            parent.id,
            parent.name,
            parent.sire_id,
            parent.dam_id,
            parent.lineage_id,
            parent.factors,
            p.generation + 1,
            CASE WHEN p.position = 'self' THEN 'dam'
                 ELSE p.position || '_dam'
            END,
            p.path || 'D'
          FROM pedigree p
          JOIN horses parent ON parent.id = p.dam_id
          WHERE p.generation < ?
        )
        SELECT
          pe.id,
          pe.name,
          pe.generation,
          pe.position,
          pe.path,
          pe.factors,
          l.name AS lineage_name,
          l.sp_st_type,
          pl.name AS parent_lineage_name
        FROM pedigree pe
        LEFT JOIN lineages l ON l.id = pe.lineage_id
        LEFT JOIN lineages pl ON pl.id = l.parent_lineage_id
        ORDER BY pe.generation, pe.path;
      `;

      const rows = await db.all<PedigreeRow>(sql, [id, depth, depth]);
      return rows;
    },
  };
}
