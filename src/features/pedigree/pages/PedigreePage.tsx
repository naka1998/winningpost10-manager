import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useRepositoryContext } from '@/app/repository-context';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { PedigreeNode } from '@/features/horses/types';
import { createPedigreeService, type InbreedingResult } from '../service';
import { PedigreeGrid } from '../components/PedigreeGrid';

type ViewMode = 'name' | 'lineage' | 'factor';

export function PedigreePage() {
  const { horseId } = useParams({ strict: false });
  const { horseRepository } = useRepositoryContext();

  const [tree, setTree] = useState<PedigreeNode | null>(null);
  const [inbreeding, setInbreeding] = useState<InbreedingResult[]>([]);
  const [depth, setDepth] = useState<4 | 5>(4);
  const [viewMode, setViewMode] = useState<ViewMode>('name');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPedigree = useCallback(
    async (currentDepth: 4 | 5) => {
      if (!horseId) {
        setIsLoading(false);
        setError('馬IDが指定されていません');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const service = createPedigreeService({ horseRepo: horseRepository });
        const pedigreeTree = await service.getPedigreeTree(Number(horseId), currentDepth);
        setTree(pedigreeTree);
        if (pedigreeTree) {
          setInbreeding(service.detectInbreeding(pedigreeTree));
        } else {
          setInbreeding([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [horseId, horseRepository],
  );

  useEffect(() => {
    loadPedigree(depth);
  }, [depth, loadPedigree]);

  const handleDepthChange = (value: string) => {
    if (value === '4' || value === '5') {
      setDepth(Number(value) as 4 | 5);
    }
  };

  const handleViewModeChange = (value: string) => {
    if (value === 'name' || value === 'lineage' || value === 'factor') {
      setViewMode(value);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">血統データがありません</p>
        <Link to="/horses/$horseId" params={{ horseId: Number(horseId) }} className="text-primary">
          馬詳細に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tree.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">※ この機能はおまけです</p>
          <Link
            to="/horses/$horseId"
            params={{ horseId: Number(horseId) }}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            馬詳細に戻る
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">世代:</span>
          <ToggleGroup type="single" value={String(depth)} onValueChange={handleDepthChange}>
            <ToggleGroupItem value="4">4世代</ToggleGroupItem>
            <ToggleGroupItem value="5">5世代</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">表示:</span>
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
            <ToggleGroupItem value="name">馬名</ToggleGroupItem>
            <ToggleGroupItem value="lineage">系統</ToggleGroupItem>
            <ToggleGroupItem value="factor">因子</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Inbreeding badges */}
      {inbreeding.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">インブリード:</span>
          {inbreeding.map((ib) => (
            <Badge key={ib.ancestorId} variant="secondary">
              {ib.ancestorName} {ib.notation}
            </Badge>
          ))}
        </div>
      )}

      {/* Pedigree Grid */}
      <div className="overflow-x-auto">
        <PedigreeGrid tree={tree} depth={depth} viewMode={viewMode} inbreeding={inbreeding} />
      </div>
    </div>
  );
}
