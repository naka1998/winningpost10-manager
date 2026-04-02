import type { PedigreeNode } from '@/features/horses/types';
import type { InbreedingResult } from '../service';
import { flattenTree, getInbreedingHighlightIds } from '../utils';
import { PedigreeCell } from './PedigreeCell';

type ViewMode = 'name' | 'lineage' | 'factor';

interface PedigreeGridProps {
  tree: PedigreeNode;
  depth: 4 | 5;
  viewMode: ViewMode;
  inbreeding: InbreedingResult[];
}

export function PedigreeGrid({ tree, depth, viewMode, inbreeding }: PedigreeGridProps) {
  const cells = flattenTree(tree, depth);
  const highlightIds = getInbreedingHighlightIds(inbreeding);
  const totalRows = 2 ** depth;
  const totalCols = depth + 1;

  return (
    <div
      data-testid="pedigree-grid"
      className="grid min-w-[800px] gap-px"
      style={{
        gridTemplateColumns: `repeat(${totalCols}, minmax(120px, 1fr))`,
        gridTemplateRows: `repeat(${totalRows}, minmax(2rem, 1fr))`,
      }}
    >
      {cells.map((cell) => (
        <PedigreeCell
          key={cell.node.path}
          node={cell.node}
          viewMode={viewMode}
          isHighlighted={highlightIds.has(cell.node.id)}
          style={{
            gridColumn: cell.column + 1,
            gridRow: `${cell.rowStart} / span ${cell.rowSpan}`,
          }}
        />
      ))}
    </div>
  );
}
