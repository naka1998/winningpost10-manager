import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useHorseStore } from '../store';
import { useLineageStore } from '@/features/lineages/store';
import type { Horse, HorseCreateInput, HorseUpdateInput } from '../types';
import type { Lineage } from '@/features/lineages/types';

const STATUS_OPTIONS = ['', '現役', '繁殖牝馬', '種牡馬', '引退', '売却済'] as const;
const SEX_OPTIONS = ['', '牡', '牝', 'セン'] as const;
const SORT_OPTIONS = [
  { value: 'name', label: '馬名' },
  { value: 'birth_year', label: '生年' },
  { value: 'status', label: 'ステータス' },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case '現役':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case '種牡馬':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case '繁殖牝馬':
      return 'bg-pink-100 text-pink-800 hover:bg-pink-100';
    case '引退':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    case '売却済':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    default:
      return '';
  }
}

function HorseFormDialog({
  open,
  onOpenChange,
  editTarget,
  lineages,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: Horse | null;
  lineages: Lineage[];
  onSubmit: (data: HorseCreateInput | (HorseUpdateInput & { id: number })) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('現役');
  const [lineageId, setLineageId] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name);
      setSex(editTarget.sex ?? '');
      setBirthYear(editTarget.birthYear?.toString() ?? '');
      setCountry(editTarget.country ?? '');
      setStatus(editTarget.status);
      setLineageId(editTarget.lineageId?.toString() ?? '');
      setNotes(editTarget.notes ?? '');
    } else {
      setName('');
      setSex('');
      setBirthYear('');
      setCountry('');
      setStatus('現役');
      setLineageId('');
      setNotes('');
    }
    setFormError(null);
  }, [editTarget, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const data = {
      name,
      sex: sex || null,
      birthYear: birthYear ? Number(birthYear) : null,
      country: country || null,
      status,
      lineageId: lineageId ? Number(lineageId) : null,
      notes: notes || null,
    };

    try {
      if (editTarget) {
        await onSubmit({ id: editTarget.id, ...data });
      } else {
        await onSubmit(data);
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
          <DialogTitle>{editTarget ? '馬を編集' : '馬を登録'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="horse-name">馬名</Label>
            <Input
              id="horse-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horse-sex">性別</Label>
              <select
                id="horse-sex"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="">未設定</option>
                <option value="牡">牡</option>
                <option value="牝">牝</option>
                <option value="セン">セン</option>
              </select>
            </div>
            <div>
              <Label htmlFor="horse-birth-year">生年</Label>
              <Input
                id="horse-birth-year"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horse-country">国</Label>
              <select
                id="horse-country"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">未設定</option>
                <option value="日">日</option>
                <option value="米">米</option>
                <option value="欧">欧</option>
              </select>
            </div>
            <div>
              <Label htmlFor="horse-status">ステータス</Label>
              <select
                id="horse-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="現役">現役</option>
                <option value="繁殖牝馬">繁殖牝馬</option>
                <option value="種牡馬">種牡馬</option>
                <option value="引退">引退</option>
                <option value="売却済">売却済</option>
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="horse-lineage">系統</Label>
            <select
              id="horse-lineage"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={lineageId}
              onChange={(e) => setLineageId(e.target.value)}
            >
              <option value="">未設定</option>
              {lineages.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="horse-notes">備考</Label>
            <Input id="horse-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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

export function HorseListPage() {
  const { horseRepository, lineageRepository } = useRepositoryContext();
  const horses = useHorseStore((s) => s.horses);
  const isLoading = useHorseStore((s) => s.isLoading);
  const error = useHorseStore((s) => s.error);
  const filter = useHorseStore((s) => s.filter);
  const hierarchy = useLineageStore((s) => s.hierarchy);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Horse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Horse | null>(null);

  // Build lineage lookup map from hierarchy
  const allLineages = useMemo(() => {
    const list: Lineage[] = [];
    for (const parent of hierarchy) {
      const { children, ...parentLineage } = parent;
      list.push(parentLineage);
      for (const child of children) {
        const { children: _grandchildren, ...childLineage } = child;
        list.push(childLineage);
      }
    }
    return list;
  }, [hierarchy]);

  const lineageMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const l of allLineages) {
      map.set(l.id, l.name);
    }
    return map;
  }, [allLineages]);

  const loadData = useCallback(() => {
    useHorseStore.getState().loadHorses(horseRepository);
    useLineageStore.getState().loadHierarchy(lineageRepository);
  }, [horseRepository, lineageRepository]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when filter changes
  useEffect(() => {
    useHorseStore.getState().loadHorses(horseRepository);
  }, [filter, horseRepository]);

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (horse: Horse) => {
    setEditTarget(horse);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: HorseCreateInput | (HorseUpdateInput & { id: number })) => {
    const store = useHorseStore.getState();
    if ('id' in data) {
      const { id, ...updateData } = data;
      await store.updateHorse(horseRepository, id, updateData);
    } else {
      await store.createHorse(horseRepository, data);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await useHorseStore.getState().deleteHorse(horseRepository, deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    const store = useHorseStore.getState();
    if (key === 'birthYearFrom' || key === 'birthYearTo') {
      store.setFilter({ [key]: value ? Number(value) : undefined });
    } else if (key === 'sortBy') {
      store.setFilter({
        sortBy: (value || undefined) as 'name' | 'birth_year' | 'status' | undefined,
      });
    } else {
      store.setFilter({ [key]: value || undefined });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="filter-status">ステータス</Label>
          <select
            id="filter-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={filter.status ?? ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'すべて'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-sex">性別フィルタ</Label>
          <select
            id="filter-sex"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={filter.sex ?? ''}
            onChange={(e) => handleFilterChange('sex', e.target.value)}
          >
            {SEX_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'すべて'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="filter-sort">ソート</Label>
          <select
            id="filter-sort"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={filter.sortBy ?? 'name'}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {horses.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">馬が登録されていません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>馬名</TableHead>
              <TableHead>性別</TableHead>
              <TableHead>生年</TableHead>
              <TableHead>国</TableHead>
              <TableHead>系統</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {horses.map((horse) => (
              <TableRow key={horse.id}>
                <TableCell>
                  <a href={`/horses/${horse.id}`} className="text-blue-600 hover:underline">
                    {horse.name}
                  </a>
                </TableCell>
                <TableCell>{horse.sex ?? '-'}</TableCell>
                <TableCell>{horse.birthYear ?? '-'}</TableCell>
                <TableCell>{horse.country ?? '-'}</TableCell>
                <TableCell>
                  {horse.lineageId ? (lineageMap.get(horse.lineageId) ?? '-') : '-'}
                </TableCell>
                <TableCell>
                  <Badge className={statusBadgeClass(horse.status)}>{horse.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(horse)}>
                      編集
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(horse)}>
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <HorseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        lineages={allLineages}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="馬の削除"
        description={`「${deleteTarget?.name}」を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
