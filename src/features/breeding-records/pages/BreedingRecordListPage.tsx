import { useEffect, useMemo, useState } from 'react';
import { useRepositoryContext } from '@/app/repository-context';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useSettingsStore } from '@/features/settings/store';
import { useBreedingRecordStore } from '../store';
import type {
  BreedingRecordCreateInput,
  BreedingRecordUpdateInput,
  BreedingRecordWithNames,
  BreedingTheory,
} from '../types';
import type { Horse } from '@/features/horses/types';

const EVALUATION_GRADES = ['S', 'A', 'B', 'C', 'D'] as const;

function TheoryInput({
  theories,
  onChange,
}: {
  theories: BreedingTheory[];
  onChange: (theories: BreedingTheory[]) => void;
}) {
  const addTheory = () => {
    onChange([...theories, { name: '', points: 0 }]);
  };

  const removeTheory = (index: number) => {
    onChange(theories.filter((_, i) => i !== index));
  };

  const updateTheory = (index: number, field: keyof BreedingTheory, value: string | number) => {
    const updated = theories.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>配合理論</Label>
        <Button type="button" variant="outline" size="sm" onClick={addTheory}>
          追加
        </Button>
      </div>
      {theories.map((theory, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="理論名"
            value={theory.name}
            onChange={(e) => updateTheory(index, 'name', e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="点数"
            value={theory.points || ''}
            onChange={(e) => updateTheory(index, 'points', Number(e.target.value))}
            className="w-20"
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => removeTheory(index)}>
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}

function BreedingRecordFormDialog({
  open,
  onOpenChange,
  editTarget,
  mares,
  stallions,
  defaultYear,
  records,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: BreedingRecordWithNames | null;
  mares: Horse[];
  stallions: Horse[];
  defaultYear: number;
  records: BreedingRecordWithNames[];
  onSubmit: (
    data:
      | (BreedingRecordCreateInput & { sireName?: string })
      | (BreedingRecordUpdateInput & { id: number; sireName?: string }),
  ) => Promise<void>;
}) {
  const [mareId, setMareId] = useState<string>('');
  const [sireText, setSireText] = useState<string>('');
  const [selectedSireId, setSelectedSireId] = useState<number | null>(null);
  const [sireDropdownOpen, setSireDropdownOpen] = useState(false);
  const [year, setYear] = useState<string>('');
  const [evaluation, setEvaluation] = useState<string>('A');
  const [theories, setTheories] = useState<BreedingTheory[]>([]);
  const [totalPower, setTotalPower] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editTarget) {
      setMareId(String(editTarget.mareId));
      setSireText(editTarget.sireName);
      const matched = stallions.find((h) => h.id === editTarget.sireId);
      setSelectedSireId(matched ? matched.id : null);
      setYear(String(editTarget.year));
      setEvaluation(editTarget.evaluation ?? 'A');
      setTheories(editTarget.theories ?? []);
      setTotalPower(editTarget.totalPower != null ? String(editTarget.totalPower) : '');
      setNotes(editTarget.notes ?? '');
    } else {
      setMareId('');
      setSireText('');
      setSelectedSireId(null);
      setYear(String(defaultYear));
      setEvaluation('A');
      setTheories([]);
      setTotalPower('');
      setNotes('');
    }
    setSireDropdownOpen(false);
    setFormError(null);
  }, [editTarget, open, defaultYear, stallions]);

  // Exclude mares already bred in the selected year (except the current edit target's mare)
  const availableMares = useMemo(() => {
    const selectedYear = Number(year);
    if (!selectedYear) return mares;
    const bredMareIds = new Set(
      records
        .filter((r) => r.year === selectedYear && r.id !== editTarget?.id)
        .map((r) => r.mareId),
    );
    return mares.filter((m) => !bredMareIds.has(m.id));
  }, [mares, year, records, editTarget]);

  const filteredStallions = useMemo(() => {
    if (!sireText.trim()) return stallions;
    const q = sireText.trim().toLowerCase();
    return stallions.filter((h) => h.name.toLowerCase().includes(q));
  }, [stallions, sireText]);

  const exactMatch = stallions.find((h) => h.name === sireText.trim());
  const showNewOption = sireText.trim() && !exactMatch;

  const handleSireSelect = (horse: Horse) => {
    setSireText(horse.name);
    setSelectedSireId(horse.id);
    setSireDropdownOpen(false);
  };

  const handleSireNewSelect = () => {
    setSelectedSireId(null);
    setSireDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sireDropdownOpen) {
      setSireDropdownOpen(false);
      return;
    }
    setFormError(null);

    if (!sireText.trim()) {
      setFormError('種牡馬を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      const isNew = !exactMatch && !selectedSireId;
      const base = {
        mareId: Number(mareId),
        sireId: selectedSireId ?? exactMatch?.id ?? 0,
        sireName: isNew ? sireText.trim() : undefined,
        year: Number(year),
        evaluation: evaluation || null,
        theories: theories.length > 0 ? theories : null,
        totalPower: totalPower ? Number(totalPower) : null,
        notes: notes || null,
      };

      if (editTarget) {
        await onSubmit({ id: editTarget.id, ...base });
      } else {
        await onSubmit(base);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? '配合記録を編集' : '配合記録を登録'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="br-year">配合年</Label>
            <Input
              id="br-year"
              type="number"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setMareId('');
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="br-mare">繁殖牝馬</Label>
            <Select value={mareId} onValueChange={setMareId} required>
              <SelectTrigger id="br-mare">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                {availableMares.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Label htmlFor="br-sire">種牡馬</Label>
            <Input
              id="br-sire"
              value={sireText}
              onChange={(e) => {
                setSireText(e.target.value);
                setSelectedSireId(null);
                setSireDropdownOpen(true);
              }}
              onFocus={() => setSireDropdownOpen(true)}
              placeholder="種牡馬名を入力して検索"
              autoComplete="off"
              required
            />
            {sireDropdownOpen && (filteredStallions.length > 0 || showNewOption) && (
              <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredStallions.map((h) => (
                  <li
                    key={h.id}
                    className="cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSireSelect(h)}
                  >
                    {h.name}
                  </li>
                ))}
                {showNewOption && (
                  <li
                    className="cursor-pointer rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleSireNewSelect}
                  >
                    「{sireText.trim()}」を新規登録
                  </li>
                )}
              </ul>
            )}
          </div>
          <div>
            <Label htmlFor="br-evaluation">評価</Label>
            <Select value={evaluation} onValueChange={setEvaluation}>
              <SelectTrigger id="br-evaluation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_GRADES.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="br-total-power">爆発力</Label>
            <Input
              id="br-total-power"
              type="number"
              value={totalPower}
              onChange={(e) => setTotalPower(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="br-notes">メモ</Label>
            <Input id="br-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <TheoryInput theories={theories} onChange={setTheories} />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving} title="Ctrl+Enterで送信">
              {isSaving ? '保存中...' : editTarget ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BreedingRecordListPage() {
  const { breedingRecordRepository, horseRepository, settingsRepository } = useRepositoryContext();
  const records = useBreedingRecordStore((s) => s.records);
  const isLoading = useBreedingRecordStore((s) => s.isLoading);
  const error = useBreedingRecordStore((s) => s.error);
  const filter = useBreedingRecordStore((s) => s.filter);
  const settings = useSettingsStore((s) => s.settings);

  const [horses, setHorses] = useState<Horse[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BreedingRecordWithNames | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BreedingRecordWithNames | null>(null);

  useEffect(() => {
    async function loadData() {
      await useSettingsStore.getState().loadSettings(settingsRepository);
      const allHorses = await horseRepository.findAll();
      setHorses(allHorses);
      await useBreedingRecordStore.getState().loadRecords(breedingRecordRepository);
    }
    loadData();
  }, [breedingRecordRepository, horseRepository, settingsRepository]);

  const isInitialMount = useState(true);
  useEffect(() => {
    if (isInitialMount[0]) {
      isInitialMount[0] = false;
      return;
    }
    useBreedingRecordStore.getState().loadRecords(breedingRecordRepository);
  }, [filter, breedingRecordRepository]);

  const mares = useMemo(() => horses.filter((h) => h.status === '繁殖牝馬'), [horses]);
  const stallions = useMemo(() => horses.filter((h) => h.status === '種牡馬'), [horses]);
  const currentYear = settings?.currentYear ?? 2025;

  const handleCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (record: BreedingRecordWithNames) => {
    setEditTarget(record);
    setDialogOpen(true);
  };

  const handleSubmit = async (
    data:
      | (BreedingRecordCreateInput & { sireName?: string })
      | (BreedingRecordUpdateInput & { id: number; sireName?: string }),
  ) => {
    const store = useBreedingRecordStore.getState();
    let { sireName: newSireName, ...recordData } = data;

    // Auto-register stallion if name doesn't match existing horse
    if (newSireName) {
      const newHorse = await horseRepository.create({
        name: newSireName,
        sex: '牡',
        status: '種牡馬',
      });
      recordData = { ...recordData, sireId: newHorse.id };
      // Refresh horse list
      const allHorses = await horseRepository.findAll();
      setHorses(allHorses);
    }

    if ('id' in recordData) {
      const { id, ...updateData } = recordData;
      await store.updateRecord(breedingRecordRepository, id, updateData);
    } else {
      await store.createRecord(breedingRecordRepository, recordData as BreedingRecordCreateInput);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await useBreedingRecordStore.getState().deleteRecord(breedingRecordRepository, deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    const numValue = value ? Number(value) : undefined;
    useBreedingRecordStore.getState().setFilter({ [key]: numValue });
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">配合記録</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">配合記録</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">配合記録</h1>
        <Button onClick={handleCreate}>新規登録</Button>
      </div>

      <div className="mb-4 flex gap-4">
        <div>
          <Label htmlFor="filter-mare">繁殖牝馬</Label>
          <Select
            value={filter.mareId != null ? String(filter.mareId) : 'all'}
            onValueChange={(v) => handleFilterChange('mareId', v === 'all' ? '' : v)}
          >
            <SelectTrigger id="filter-mare" className="w-40">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {mares.map((h) => (
                <SelectItem key={h.id} value={String(h.id)}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-sire">種牡馬</Label>
          <Select
            value={filter.sireId != null ? String(filter.sireId) : 'all'}
            onValueChange={(v) => handleFilterChange('sireId', v === 'all' ? '' : v)}
          >
            <SelectTrigger id="filter-sire" className="w-40">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {stallions.map((h) => (
                <SelectItem key={h.id} value={String(h.id)}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="filter-year">配合年</Label>
          <Input
            id="filter-year"
            type="number"
            className="w-28"
            value={filter.year ?? ''}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            placeholder="すべて"
          />
        </div>
      </div>

      {records.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">配合記録がありません</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>繁殖牝馬</TableHead>
              <TableHead>種牡馬</TableHead>
              <TableHead>配合年</TableHead>
              <TableHead>評価</TableHead>
              <TableHead>配合理論</TableHead>
              <TableHead>爆発力</TableHead>
              <TableHead>産駒</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.mareName}</TableCell>
                <TableCell>{record.sireName}</TableCell>
                <TableCell>{record.year}</TableCell>
                <TableCell>{record.evaluation ?? '-'}</TableCell>
                <TableCell>{record.theories?.map((t) => t.name).join(', ') ?? '-'}</TableCell>
                <TableCell>{record.totalPower ?? '-'}</TableCell>
                <TableCell>{record.offspringName ?? '-'}</TableCell>
                <TableCell title={record.notes ?? undefined}>
                  {record.notes
                    ? record.notes.length > 10
                      ? `${record.notes.slice(0, 10)}…`
                      : record.notes
                    : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                      編集
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(record)}>
                      削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BreedingRecordFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
        mares={mares}
        stallions={stallions}
        defaultYear={currentYear}
        records={records}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="配合記録の削除"
        description="この配合記録を削除しますか？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmLabel="削除する"
        variant="destructive"
      />
    </div>
  );
}
