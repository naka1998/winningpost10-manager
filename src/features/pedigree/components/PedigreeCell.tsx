import { Link } from '@tanstack/react-router';
import type { PedigreeNode } from '@/features/horses/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getLineageColor } from '../utils';

type ViewMode = 'name' | 'lineage' | 'factor';

interface PedigreeCellProps {
  node: PedigreeNode;
  viewMode: ViewMode;
  isHighlighted: boolean;
  style: React.CSSProperties;
}

const COUNTRY_FLAGS: Record<string, string> = {
  日: '🇯🇵',
  米: '🇺🇸',
  欧: '🇪🇺',
};

function NameView({ node }: { node: PedigreeNode }) {
  return (
    <>
      <span className="font-medium">{node.name}</span>
      {node.country && COUNTRY_FLAGS[node.country] && (
        <span className="ml-1">{COUNTRY_FLAGS[node.country]}</span>
      )}
    </>
  );
}

function LineageView({ node }: { node: PedigreeNode }) {
  return (
    <>
      {node.lineageName && <span className="text-sm font-medium">{node.lineageName}</span>}
      {node.parentLineageName && (
        <span className="text-xs text-muted-foreground">{node.parentLineageName}</span>
      )}
      {!node.lineageName && !node.parentLineageName && (
        <span className="text-xs text-muted-foreground">-</span>
      )}
    </>
  );
}

function FactorView({ node }: { node: PedigreeNode }) {
  return (
    <>
      {node.spStType && (
        <Badge variant={node.spStType === 'SP' ? 'default' : 'secondary'} className="text-xs">
          {node.spStType}
        </Badge>
      )}
      {node.factors && node.factors.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {node.factors.map((f) => (
            <Badge key={f} variant="outline" className="text-xs">
              {f}
            </Badge>
          ))}
        </div>
      )}
      {!node.spStType && (!node.factors || node.factors.length === 0) && (
        <span className="text-xs text-muted-foreground">-</span>
      )}
    </>
  );
}

export function PedigreeCell({ node, viewMode, isHighlighted, style }: PedigreeCellProps) {
  const bgColor = getLineageColor(node.parentLineageName);

  const content = (
    <div
      data-testid={`pedigree-cell-${node.id}`}
      className={cn(
        'flex flex-col items-center justify-center border border-border p-1 text-center text-xs',
        bgColor,
        isHighlighted && 'ring-2 ring-yellow-500',
      )}
      style={style}
    >
      {viewMode === 'name' && <NameView node={node} />}
      {viewMode === 'lineage' && <LineageView node={node} />}
      {viewMode === 'factor' && <FactorView node={node} />}
    </div>
  );

  // Root node (generation 0) is not a link
  if (node.generation === 0) {
    return content;
  }

  return (
    <Link to="/horses/$horseId" params={{ horseId: node.id }} className="contents">
      {content}
    </Link>
  );
}
