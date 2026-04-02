import type { DatabaseConnection } from '@/database/connection';
import type {
  BroodmareSummary,
  BroodmareOffspring,
  BroodmareFilter,
  LineageDistribution,
} from './types';

export interface BroodmareRepository {
  findAllSummaries(currentYear: number, filter?: BroodmareFilter): Promise<BroodmareSummary[]>;
  findOffspring(mareId: number): Promise<BroodmareOffspring[]>;
  getSireLineDistribution(): Promise<LineageDistribution[]>;
  getDamLineDistribution(): Promise<LineageDistribution[]>;
  getStallionDistribution(): Promise<LineageDistribution[]>;
}

const GRADE_ORDER = ['G1', 'G2', 'G3', 'OP', 'Pre-OP', '3勝', '2勝', '1勝', '未勝利'] as const;

function bestGradeFromRank(rank: number | null): string | null {
  if (rank === null || rank < 0 || rank >= GRADE_ORDER.length) return null;
  return GRADE_ORDER[rank];
}

const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'h.name',
  birthYear: 'h.birth_year',
  offspringCount: 'offspring_count',
  breedingStartYear: 'breeding_start_year',
};

export function createBroodmareRepository(db: DatabaseConnection): BroodmareRepository {
  return {
    async findAllSummaries(currentYear: number, filter?: BroodmareFilter) {
      const gradeCase = GRADE_ORDER.map((g, i) => `WHEN '${g}' THEN ${i}`).join(' ');

      const sortCol = SORT_COLUMN_MAP[filter?.sortBy ?? 'name'] ?? 'h.name';
      const sortOrder = filter?.sortOrder === 'desc' ? 'DESC' : 'ASC';

      const sql = `
        SELECT
          h.id, h.name, h.birth_year,
          (? - h.birth_year + 1) AS age,
          MIN(br.year) AS breeding_start_year,
          COUNT(DISTINCT CASE WHEN offspring.status != 'ancestor' THEN offspring.id END) AS offspring_count,
          COUNT(DISTINCT CASE WHEN offspring.status = '現役' THEN offspring.id END) AS active_offspring_count,
          MIN(CASE ys.grade ${gradeCase} ELSE 999 END) AS grade_rank
        FROM horses h
        LEFT JOIN breeding_records br ON br.mare_id = h.id
        LEFT JOIN horses offspring ON offspring.dam_id = h.id AND offspring.status != 'ancestor'
        LEFT JOIN yearly_statuses ys ON ys.horse_id = offspring.id AND ys.grade IS NOT NULL
        WHERE h.status = '繁殖牝馬'
        GROUP BY h.id
        ORDER BY ${sortCol} ${sortOrder}, h.name ASC
      `;

      const rows = await db.all<Record<string, unknown>>(sql, [currentYear]);

      return rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
        birthYear: (row.birth_year as number) ?? null,
        age: (row.age as number) ?? null,
        breedingStartYear: (row.breeding_start_year as number) ?? null,
        offspringCount: (row.offspring_count as number) ?? 0,
        activeOffspringCount: (row.active_offspring_count as number) ?? 0,
        bestGrade: bestGradeFromRank(row.grade_rank === 999 ? null : (row.grade_rank as number)),
      }));
    },

    async findOffspring(mareId: number) {
      const gradeCase = GRADE_ORDER.map((g, i) => `WHEN '${g}' THEN ${i}`).join(' ');

      const sql = `
        SELECT
          o.id, o.name, o.birth_year, o.sex, o.status,
          s.name AS sire_name,
          MIN(CASE ys.grade ${gradeCase} ELSE 999 END) AS grade_rank,
          br.evaluation, br.total_power, br.notes AS breeding_notes
        FROM horses o
        LEFT JOIN horses s ON s.id = o.sire_id
        LEFT JOIN yearly_statuses ys ON ys.horse_id = o.id AND ys.grade IS NOT NULL
        LEFT JOIN breeding_records br ON br.offspring_id = o.id
        WHERE o.dam_id = ? AND o.status != 'ancestor'
        GROUP BY o.id
        ORDER BY o.birth_year DESC, o.name ASC
      `;

      const rows = await db.all<Record<string, unknown>>(sql, [mareId]);

      return rows.map((row) => ({
        id: row.id as number,
        name: row.name as string,
        birthYear: (row.birth_year as number) ?? null,
        sex: (row.sex as string) ?? null,
        status: row.status as string,
        sireName: (row.sire_name as string) ?? null,
        bestGrade: bestGradeFromRank(row.grade_rank === 999 ? null : (row.grade_rank as number)),
        evaluation: (row.evaluation as string) ?? null,
        totalPower: (row.total_power as number) ?? null,
        breedingNotes: (row.breeding_notes as string) ?? null,
      }));
    },

    async getSireLineDistribution() {
      const sql = `
        SELECT l.name, COUNT(*) AS count
        FROM horses offspring
        JOIN horses sire ON sire.id = offspring.sire_id
        JOIN lineages l ON l.id = sire.lineage_id
        WHERE offspring.dam_id IN (SELECT id FROM horses WHERE status = '繁殖牝馬')
          AND offspring.status != 'ancestor'
        GROUP BY l.id, l.name
        ORDER BY count DESC
      `;
      const rows = await db.all<{ name: string; count: number }>(sql);
      return rows.map((r) => ({ name: r.name, count: r.count }));
    },

    async getDamLineDistribution() {
      const sql = `
        SELECT h.mare_line AS name, COUNT(*) AS count
        FROM horses h
        WHERE h.status = '繁殖牝馬' AND h.mare_line IS NOT NULL
        GROUP BY h.mare_line
        ORDER BY count DESC
      `;
      const rows = await db.all<{ name: string; count: number }>(sql);
      return rows.map((r) => ({ name: r.name, count: r.count }));
    },

    async getStallionDistribution() {
      const sql = `
        SELECT s.name, COUNT(*) AS count
        FROM breeding_records br
        JOIN horses s ON s.id = br.sire_id
        JOIN horses m ON m.id = br.mare_id AND m.status = '繁殖牝馬'
        GROUP BY s.id, s.name
        ORDER BY count DESC
      `;
      const rows = await db.all<{ name: string; count: number }>(sql);
      return rows.map((r) => ({ name: r.name, count: r.count }));
    },
  };
}
