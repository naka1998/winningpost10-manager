import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useRepositoryContext } from '@/app/repository-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useHorseStore } from '../store';
import { useLineageStore } from '@/features/lineages/store';
import type { Horse, HorseCreateInput, HorseUpdateInput } from '../types';
import type { Lineage } from '@/features/lineages/types';

const TAB_DEFINITIONS = [
  { value: 'active', label: '現役', filter: { status: '現役', statuses: undefined } },
  {
    value: 'retired',
    label: '引退',
    filter: { status: undefined, statuses: ['引退', '種牡馬', '繁殖牝馬', '売却済'] },
  },
  { value: 'stallion', label: '種牡馬', filter: { status: '種牡馬', statuses: undefined } },
  {
    value: 'broodmare',
    label: '繁殖牝馬',
    filter: { status: '繁殖牝馬', statuses: undefined },
  },
] as const;

const SORT_OPTIONS = [
  { value: 'name', label: '馬名' },
  { value: 'birth_year', label: '生年' },
  { value: 'status', label: 'ステータス' },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case '現役':
      return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-900';
    case '種牡馬':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-900';
    case '繁殖牝馬':
      return 'bg-pink-100 text-pink-800 hover:bg-pink-100 dark:bg-pink-900 dark:text-pink-200 dark:hover:bg-pink-900';
    case '引退':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-800';
    case '売却済':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-900';
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
      setSex('牡');
      setBirthYear('');
      setCountry('日');
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
              <Label>性別</Label>
              <ToggleGroup type="single" value={sex} onValueChange={(v) => v && setSex(v)}>
                <ToggleGroupItem value="牡">牡</ToggleGroupItem>
                <ToggleGroupItem value="牝">牝</ToggleGroupItem>
              </ToggleGroup>
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
              <Label>国</Label>
              <ToggleGroup type="single" value={country} onValueChange={(v) => v && setCountry(v)}>
                <ToggleGroupItem value="日">日</ToggleGroupItem>
                <ToggleGroupItem value="米">米</ToggleGroupItem>
                <ToggleGroupItem value="欧">欧</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div>
              <Label>ステータス</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="現役">現役</SelectItem>
                  <SelectItem value="繁殖牝馬">繁殖牝馬</SelectItem>
                  <SelectItem value="種牡馬">種牡馬</SelectItem>
                  <SelectItem value="引退">引退</SelectItem>
                  <SelectItem value="売却済">売却済</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>系統</Label>
            <Select value={lineageId} onValueChange={setLineageId}>
              <SelectTrigger>
                <SelectValue placeholder="未設定" />
              </SelectTrigger>
              <SelectContent>
                {lineages.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="horse-notes">備考</Label>
            <Input id="horse-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
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

  const isInitialMount = useRef(true);

  useEffect(() => {
    // wa-sqlite は並行アクセスに対応していないため、DB操作を直列化する
    async function loadData() {
      await useLineageStore.getState().loadHierarchy(lineageRepository);
      await useHorseStore.getState().loadHorses(horseRepository);
    }
    loadData();
  }, [horseRepository, lineageRepository]);

  // Reload when filter changes (skip initial mount to avoid double fetch)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
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

  const handleTabChange = (tabValue: string) => {
    const tab = TAB_DEFINITIONS.find((t) => t.value === tabValue);
    if (!tab) return;
    const store = useHorseStore.getState();
    store.setFilter({
      status: tab.filter.status,
      statuses: tab.filter.statuses as string[] | undefined,
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    const store = useHorseStore.getState();
    if (key === 'birthYearFrom' || key === 'birthYearTo' || key === 'lineageId') {
      store.setFilter({ [key]: value ? Number(value) : undefined });
    } else if (key === 'sortBy') {
      store.setFilter({
        sortBy: (value || undefined) as 'name' | 'birth_year' | 'status' | undefined,
      });
    } else {
      store.setFilter({ [key]: value || undefined });
    }
  };

  if (isLoading && horses.length === 0) {
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
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  // Determine current tab from filter state
  const currentTab =
    TAB_DEFINITIONS.find((t) => {
      if (t.filter.statuses) {
        return filter.statuses && filter.statuses.length > 0;
      }
      return filter.status === t.filter.status && !filter.statuses;
    })?.value ?? 'active';

  const filterBar = (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div>
        <Label>性別フィルタ</Label>
        <ToggleGroup
          type="single"
          value={filter.sex ?? 'all'}
          onValueChange={(v) => handleFilterChange('sex', v === 'all' ? '' : v)}
        >
          <ToggleGroupItem value="all">すべて</ToggleGroupItem>
          <ToggleGroupItem value="牡">牡</ToggleGroupItem>
          <ToggleGroupItem value="牝">牝</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div>
        <Label>系統フィルタ</Label>
        <Select
          value={filter.lineageId?.toString() ?? 'all'}
          onValueChange={(v) => handleFilterChange('lineageId', v === 'all' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {allLineages.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-birth-year-from">生年（から）</Label>
        <Input
          id="filter-birth-year-from"
          type="number"
          placeholder="例: 2000"
          value={filter.birthYearFrom?.toString() ?? ''}
          onChange={(e) => handleFilterChange('birthYearFrom', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="filter-birth-year-to">生年（まで）</Label>
        <Input
          id="filter-birth-year-to"
          type="number"
          placeholder="例: 2025"
          value={filter.birthYearTo?.toString() ?? ''}
          onChange={(e) => handleFilterChange('birthYearTo', e.target.value)}
        />
      </div>
      <div>
        <Label>ソート</Label>
        <Select
          value={filter.sortBy ?? 'name'}
          onValueChange={(v) => handleFilterChange('sortBy', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const horseTable =
    horses.length === 0 ? (
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
                <Link
                  to="/horses/$horseId"
                  params={{ horseId: horse.id }}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {horse.name}
                </Link>
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
    );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">馬一覧</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {TAB_DEFINITIONS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TAB_DEFINITIONS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {filterBar}
            {horseTable}
          </TabsContent>
        ))}
      </Tabs>

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
