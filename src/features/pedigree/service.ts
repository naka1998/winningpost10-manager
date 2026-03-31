import type { HorseRepository } from '@/features/horses/repository';
import type { PedigreeNode } from '@/features/horses/types';

export interface PedigreeRow {
  id: number;
  name: string;
  generation: number;
  position: string;
  path: string;
  factors: string | null;
  lineage_name: string | null;
  sp_st_type: string | null;
  parent_lineage_name: string | null;
}

export interface InbreedingResult {
  ancestorName: string;
  ancestorId: number;
  paths: string[];
  notation: string; // e.g. "3×4"
}

export interface PedigreeService {
  getPedigreeTree(horseId: number, depth?: number): Promise<PedigreeNode | null>;
  detectInbreeding(tree: PedigreeNode): InbreedingResult[];
}

export function createPedigreeService(deps: {
  horseRepo: HorseRepository;
}): PedigreeService {
  return {
    async getPedigreeTree(horseId: number, depth: number = 4) {
      const rows = await deps.horseRepo.getAncestorRows(horseId, depth);
      if (rows.length === 0) return null;
      return buildPedigreeTree(rows);
    },

    detectInbreeding(tree: PedigreeNode): InbreedingResult[] {
      const idPaths = new Map<number, { name: string; generations: number[] }>();
      collectAncestorPaths(tree, idPaths);

      const results: InbreedingResult[] = [];
      for (const [id, { name, generations }] of idPaths) {
        if (generations.length >= 2) {
          const sorted = [...generations].sort((a, b) => a - b);
          results.push({
            ancestorName: name,
            ancestorId: id,
            paths: sorted.map(String),
            notation: sorted.join('×'),
          });
        }
      }
      return results;
    },
  };
}

function collectAncestorPaths(
  node: PedigreeNode,
  result: Map<number, { name: string; generations: number[] }>,
): void {
  if (node.generation > 0) {
    const entry = result.get(node.id);
    if (entry) {
      entry.generations.push(node.generation);
    } else {
      result.set(node.id, { name: node.name, generations: [node.generation] });
    }
  }
  if (node.sire) collectAncestorPaths(node.sire, result);
  if (node.dam) collectAncestorPaths(node.dam, result);
}

/** Build a pedigree tree from flat row data. Pure function. */
export function buildPedigreeTree(rows: PedigreeRow[]): PedigreeNode {
  const nodeMap = new Map<string, PedigreeNode>();

  for (const row of rows) {
    let factors: string[] | null = null;
    if (row.factors) {
      try {
        factors = JSON.parse(row.factors);
      } catch {
        factors = null;
      }
    }

    const node: PedigreeNode = {
      id: row.id,
      name: row.name,
      generation: row.generation,
      position: row.position,
      path: row.path,
      factors,
      lineageName: row.lineage_name,
      spStType: row.sp_st_type,
      parentLineageName: row.parent_lineage_name,
    };

    nodeMap.set(row.path, node);
  }

  // Build tree: link sire/dam references
  for (const [path, node] of nodeMap) {
    const sireNode = nodeMap.get(path + 'S');
    const damNode = nodeMap.get(path + 'D');
    if (sireNode) node.sire = sireNode;
    if (damNode) node.dam = damNode;
  }

  return nodeMap.get('')!;
}
