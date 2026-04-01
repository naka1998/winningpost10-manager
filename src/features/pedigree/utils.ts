import type { PedigreeNode } from '@/features/horses/types';
import type { InbreedingResult } from './service';

export interface GridCell {
  node: PedigreeNode;
  column: number;
  rowStart: number;
  rowSpan: number;
}

/**
 * Flatten a pedigree tree into an array of GridCell objects with CSS Grid coordinates.
 *
 * Layout: column = generation (0=self, 1=parents, ..., depth).
 * Row positions are computed from the path string:
 *   - Each 'S' (sire) maps to bit 0, each 'D' (dam) maps to bit 1.
 *   - The row index within that generation is the binary number from the path.
 *   - rowSpan = totalRows / 2^generation.
 */
export function flattenTree(tree: PedigreeNode, depth: 4 | 5): GridCell[] {
  const totalRows = 2 ** depth;
  const cells: GridCell[] = [];

  function walk(node: PedigreeNode): void {
    const gen = node.path.length; // generation = path length
    const rowSpan = totalRows / 2 ** gen;

    // Compute row index from path: S=0, D=1 for each position
    let rowIndex = 0;
    for (let i = 0; i < node.path.length; i++) {
      if (node.path[i] === 'D') {
        rowIndex += 2 ** (node.path.length - 1 - i);
      }
    }

    cells.push({
      node,
      column: gen,
      rowStart: rowIndex * rowSpan + 1, // CSS Grid is 1-indexed
      rowSpan,
    });

    if (node.sire) walk(node.sire);
    if (node.dam) walk(node.dam);
  }

  walk(tree);
  return cells;
}

const LINEAGE_COLORS: Record<string, string> = {
  ナスルーラ系: 'bg-red-100 dark:bg-red-950',
  ノーザンダンサー系: 'bg-blue-100 dark:bg-blue-950',
  ミスタープロスペクター系: 'bg-amber-100 dark:bg-amber-950',
  ネイティヴダンサー系: 'bg-green-100 dark:bg-green-950',
  ロイヤルチャージャー系: 'bg-purple-100 dark:bg-purple-950',
  エクリプス系: 'bg-orange-100 dark:bg-orange-950',
  セントサイモン系: 'bg-teal-100 dark:bg-teal-950',
  ヘイルトゥリーズン系: 'bg-indigo-100 dark:bg-indigo-950',
  ターントゥ系: 'bg-pink-100 dark:bg-pink-950',
  サンデーサイレンス系: 'bg-cyan-100 dark:bg-cyan-950',
};

const HASH_COLORS = [
  'bg-slate-100 dark:bg-slate-950',
  'bg-zinc-100 dark:bg-zinc-950',
  'bg-stone-100 dark:bg-stone-950',
  'bg-rose-100 dark:bg-rose-950',
  'bg-lime-100 dark:bg-lime-950',
  'bg-emerald-100 dark:bg-emerald-950',
  'bg-sky-100 dark:bg-sky-950',
  'bg-violet-100 dark:bg-violet-950',
  'bg-fuchsia-100 dark:bg-fuchsia-950',
];

const DEFAULT_COLOR = 'bg-muted';

/** Returns a Tailwind background color class based on parent lineage name. */
export function getLineageColor(parentLineageName: string | null): string {
  if (!parentLineageName) return DEFAULT_COLOR;

  const known = LINEAGE_COLORS[parentLineageName];
  if (known) return known;

  // Hash-based fallback for unknown lineages
  let hash = 0;
  for (let i = 0; i < parentLineageName.length; i++) {
    hash = (hash * 31 + parentLineageName.charCodeAt(i)) | 0;
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}

/** Extracts the set of ancestor IDs that appear in inbreeding results. */
export function getInbreedingHighlightIds(results: InbreedingResult[]): Set<number> {
  return new Set(results.map((r) => r.ancestorId));
}
