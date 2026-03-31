import { useEffect, useMemo, useState } from 'react';
import { useRepositoryContext } from '@/app/repository-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { filterHierarchy, useLineageStore } from '../store';
import type { Lineage, LineageCreateInput, LineageNode, LineageUpdateInput } from '../types';

function SpStBadge({ spStType }: { spStType: 'SP' | 'ST' | null }) {
  if (!spStType) return null;
  return (
    <Badge
      className={
        spStType === 'SP'
          ? 'bg-red-100 text-red-800 hover:bg-red-100'
          : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      }
    >
      {spStType}
    </Badge>
  );
}

function LineageFormDialog({
  open,
  onOpenChange,
  editTarget,
  parentLineages,
  hierarchy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Lineage | null;
  parentLineages: Lineage[];
  hierarchy: LineageNode[];
  onSubmit: (data: LineageCreateInput | (LineageUpdateInput & { id: number })) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [lineageType, setLineageType] = useState<'parent' | 'child'>('parent');
  const [parentLineageId, setParentLineageId] = useState<string>('');
  const [spStType, setSpStType] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 編集対象が子を持つ親系統かどうか
  const isParentWithChildren =
    editTarget?.lineageType === 'parent' &&
    hierarchy.some((h) => h.id === editTarget.id && h.children.length > 0);

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name);
      setLineageType(editTarget.lineageType);
      setParentLineageId(editTarget.parentLineageId?.toString() ?? '');
      setSpStType(editTarget.spStType ?? '');
    } else {
      setName('');
      setLineageType('parent');
      setParentLineageId('');
      setSpStType('');
    }
    setFormError(null);
  }, [editTarget, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (lineageType === 'child' && !parentLineageId) {
      setFormError('子系統の場合は親系統を選択してください');
      return;
    }

    const spSt = spStType === 'SP' || spStType === 'ST' ? spStType : null;
    setIsSaving(true);
    try {
      if (editTarget) {
        await onSubmit({
          id: editTarget.id,
          name,
          lineageType,
          parentLineageId: parentLineageId ? Number(parentLineageId) : null,
          spStType: spSt,
        });
      } else {
        await onSubmit({
          name,
          lineageType,
          parentLineageId: parentLineageId ? Number(parentLineageId) : null,
          spStType: spSt,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editTarget ? '系統を編集' : '系統を登録'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="lineage-name">系統名</Label>
            <Input
              id="lineage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="lineage-type">系統タイプ</Label>
            <select
              id="lineage-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              value={lineageType}
              onChange={(e) => setLineageType(e.target.value as 'parent' | 'child')}
              disabled={isParentWithChildren}
            >
              <option value="parent">親系統</option>
              <option value="child">子系統</option>
            </select>
            {isParentWithChildren && (
              <p className="mt-1 text-xs text-muted-foreground">
                子系統を持つ親系統のタイプは変更できません
              </p>
            )}
          </div>
          {lineageType === 'child' && (
            <div>
              <Label htmlFor="parent-lineage">親系統</Label>
              <select
                id="parent-lineage"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={parentLineageId}
                onChange={(e) => setParentLineageId(e.target.value)}
                required
              >
                <option value="">選択してください</option>
                {parentLineages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="sp-st-type">SP/ST</Label>
            <select
              id="sp-st-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={spStType}
              onChange={(e) => setSpStType(e.target.value)}
            >
              <option value="">なし</option>
              <option value="SP">SP</option>
              <option value="ST">ST</option>
            </select>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : editTarget ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LineageChildRow({
  child,
  onEdit,
}: {
  child: LineageNode;
  onEdit: (lineage: Lineage) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">└</span>
        <span>{child.name}</span>
        <SpStBadge spStType={child.spStType} />
      </div>
      <Button variant="ghost" size="sm" onClick={() => onEdit(child)}>
        編集
      </Button>
    </div>
  );
}

function LineageParentCard({
  node,
  onEdit,
}: {
  node: LineageNode;
  onEdit: (lineage: Lineage) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{expanded ? '▼' : '▶'}</span>
          <span className="font-semibold">{node.name}</span>
          <SpStBadge spStType={node.spStType} />
          <Badge variant="secondary">{node.children.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(node);
          }}
        >
          編集
        </Button>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="border-t bg-muted/30 pl-4">
          {node.children.map((child) => (
            <LineageChildRow key={child.id} child={child} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LineageListPage() {
  const { lineageRepository } = useRepositoryContext();
  const isLoading = useLineageStore((s) => s.isLoading);
  const error = useLineageStore((s) => s.error);
  const searchQuery = useLineageStore((s) => s.searchQuery);
  const parentLineages = useLineageStore((s) => s.parentLineages);
  const hierarchy = useLineageStore((s) => s.hierarchy);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Lineage | null>(null);

  useEffect(() => {
    useLineageStore.getState().loadHierarchy(lineageRepository);
  }, [lineageRepository]);

  const filteredHierarchy = useMemo(
    () => filterHierarchy(hierarchy, searchQuery),
    [hierarchy, searchQuery],
  );

  const handleEdit = (lineage: Lineage) => {
    setEditTarget(lineage);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: LineageCreateInput | (LineageUpdateInput & { id: number })) => {
    const store = useLineageStore.getState();
    if ('id' in data) {
      const { id, ...updateData } = data;
      await store.updateLineage(lineageRepository, id, updateData);
    } else {
      await store.createLineage(lineageRepository, data);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">系統マスタ</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">系統マスタ</h1>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">系統マスタ</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="系統名で検索..."
          value={searchQuery}
          onChange={(e) => useLineageStore.getState().setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filteredHierarchy.map((node) => (
          <LineageParentCard key={node.id} node={node} onEdit={handleEdit} />
        ))}
        {filteredHierarchy.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">該当する系統がありません</p>
        )}
      </div>

      <LineageFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        parentLineages={parentLineages}
        hierarchy={hierarchy}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
