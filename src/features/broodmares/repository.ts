import type { DatabaseConnection } from '@/database/connection';
import type {
  BroodmareSummary,
  BroodmareOffspring,
  BroodmareFilter,
  LineageDistribution,
  GradeCount,
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

function parseGradeDistribution(concatStr: string | null): GradeCount[] {
  if (!concatStr) return [];
  const grades = concatStr.split(',');
  const countMap = new Map<string, number>();
  for (const g of grades) {
    countMap.set(g, (countMap.get(g) ?? 0) + 1);
  }
  // Sort by GRADE_ORDER
  const gradeIndex = new Map<string, number>(GRADE_ORDER.map((g, i) => [g, i]));
  return [...countMap.entries()]
    .sort((a, b) => (gradeIndex.get(a[0]) ?? 999) - (gradeIndex.get(b[0]) ?? 999))
    .map(([grade, count]) => ({ grade, count }));
}

const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'h.name',
  birthYear: 'h.birth_year',
  offspringCount: 'offspring_count',
  breedingStartYear: 'breeding_start_year',
  avgEvaluation: 'avg_evaluation',
  avgTotalPower: 'avg_total_power',
  avgGradeScore: 'avg_grade_score',
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
          (SELECT MIN(br2.year) FROM breeding_records br2 WHERE br2.mare_id = h.id) AS breeding_start_year,
          COUNT(DISTINCT CASE WHEN offspring.status != 'ancestor' THEN offspring.id END) AS offspring_count,
          COUNT(DISTINCT CASE WHEN offspring.status = '現役' THEN offspring.id END) AS active_offspring_count,
          (SELECT GROUP_CONCAT(bg.best_grade)
           FROM (
             SELECT MIN(CASE ys2.grade ${gradeCase} ELSE 999 END) AS best_rank,
                    CASE MIN(CASE ys2.grade ${gradeCase} ELSE 999 END)
                      ${GRADE_ORDER.map((g, i) => `WHEN ${i} THEN '${g}'`).join(' ')}
                    END AS best_grade
             FROM horses o2
             JOIN yearly_statuses ys2 ON ys2.horse_id = o2.id AND ys2.grade IS NOT NULL
             WHERE o2.dam_id = h.id AND o2.status != 'ancestor'
             GROUP BY o2.id
             HAVING best_rank < 999
           ) bg) AS offspring_grades,
          (SELECT AVG(gs.score) FROM (
             SELECT CASE MIN(CASE ys3.grade WHEN 'G1' THEN 1 WHEN 'G2' THEN 2 WHEN 'G3' THEN 3 ELSE 999 END)
               WHEN 1 THEN 5 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END AS score
             FROM horses o3
             LEFT JOIN yearly_statuses ys3 ON ys3.horse_id = o3.id AND ys3.grade IN ('G1', 'G2', 'G3')
             WHERE o3.dam_id = h.id AND o3.status != 'ancestor'
             GROUP BY o3.id
           ) gs) AS avg_grade_score,
          (SELECT AVG(CASE bre.evaluation WHEN 'S' THEN 5 WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 ELSE NULL END)
           FROM breeding_records bre WHERE bre.mare_id = h.id AND bre.evaluation IS NOT NULL) AS avg_evaluation,
          (SELECT AVG(bre2.total_power)
           FROM breeding_records bre2 WHERE bre2.mare_id = h.id AND bre2.total_power IS NOT NULL) AS avg_total_power
        FROM horses h
        LEFT JOIN horses offspring ON offspring.dam_id = h.id AND offspring.status != 'ancestor'
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
        gradeDistribution: parseGradeDistribution((row.offspring_grades as string) ?? null),
        avgGradeScore:
          row.avg_grade_score != null
            ? Math.round((row.avg_grade_score as number) * 100) / 100
            : null,
        avgEvaluation:
          row.avg_evaluation != null
            ? Math.round((row.avg_evaluation as number) * 100) / 100
            : null,
        avgTotalPower:
          row.avg_total_power != null ? Math.round(row.avg_total_power as number) : null,
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
