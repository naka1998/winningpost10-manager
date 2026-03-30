import type { DatabaseConnection } from '@/database/connection';
import { buildInsert, buildUpdate, mapRow } from '@/database/base-repository';
import type { Lineage, LineageCreateInput, LineageNode, LineageUpdateInput } from './types';

export interface LineageRepository {
  findById(id: number): Promise<Lineage | null>;
  findByName(name: string): Promise<Lineage | null>;
  findAll(): Promise<Lineage[]>;
  getChildren(parentId: number): Promise<Lineage[]>;
  getHierarchy(): Promise<LineageNode[]>;
  create(data: LineageCreateInput): Promise<Lineage>;
  update(id: number, data: LineageUpdateInput): Promise<Lineage>;
}

function mapLineageRow(row: Record<string, unknown>): Lineage {
  return mapRow<Lineage>(row);
}

function lineageToColumns(data: LineageCreateInput | LineageUpdateInput): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if (data.name !== undefined) columns.name = data.name;
  if (data.lineageType !== undefined) columns.lineage_type = data.lineageType;
  if (data.parentLineageId !== undefined) columns.parent_lineage_id = data.parentLineageId;
  if (data.spStType !== undefined) columns.sp_st_type = data.spStType;
  if (data.notes !== undefined) columns.notes = data.notes;
  return columns;
}

export function createLineageRepository(db: DatabaseConnection): LineageRepository {
  return {
    async findById(id: number) {
      const row = await db.get<Record<string, unknown>>('SELECT * FROM lineages WHERE id = ?', [
        id,
      ]);
      return row ? mapLineageRow(row) : null;
    },

    async findByName(name: string) {
      const row = await db.get<Record<string, unknown>>('SELECT * FROM lineages WHERE name = ?', [
        name,
      ]);
      return row ? mapLineageRow(row) : null;
    },

    async findAll() {
      const rows = await db.all<Record<string, unknown>>(
        'SELECT * FROM lineages ORDER BY lineage_type DESC, name ASC',
      );
      return rows.map(mapLineageRow);
    },

    async getChildren(parentId: number) {
      const rows = await db.all<Record<string, unknown>>(
        'SELECT * FROM lineages WHERE parent_lineage_id = ? ORDER BY name ASC',
        [parentId],
      );
      return rows.map(mapLineageRow);
    },

    async getHierarchy() {
      const all = await this.findAll();
      const parentNodes: LineageNode[] = [];
      const childMap = new Map<number, LineageNode[]>();

      // Group children by parent_lineage_id
      for (const lineage of all) {
        if (lineage.lineageType === 'child' && lineage.parentLineageId) {
          const siblings = childMap.get(lineage.parentLineageId) ?? [];
          siblings.push({ ...lineage, children: [] });
          childMap.set(lineage.parentLineageId, siblings);
        }
      }

      // Build parent nodes with children
      for (const lineage of all) {
        if (lineage.lineageType === 'parent') {
          parentNodes.push({
            ...lineage,
            children: childMap.get(lineage.id) ?? [],
          });
        }
      }

      return parentNodes;
    },

    async create(data: LineageCreateInput) {
      const columns = lineageToColumns(data);
      const { sql, params } = buildInsert('lineages', columns);
      const result = await db.run(sql, params);
      const lineage = await this.findById(result.lastInsertRowId);
      return lineage!;
    },

    async update(id: number, data: LineageUpdateInput) {
      const columns = lineageToColumns(data);
      if (Object.keys(columns).length === 0) {
        const lineage = await this.findById(id);
        return lineage!;
      }
      const { sql, params } = buildUpdate('lineages', id, columns);
      await db.run(sql, params);
      const lineage = await this.findById(id);
      return lineage!;
    },
  };
}
