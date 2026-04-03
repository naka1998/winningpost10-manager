import { useEffect, useMemo, useState } from 'react';
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
import { EVALUATION_GRADES } from '../constants';
import { TheoryInput } from './TheoryInput';
import type {
  BreedingRecordCreateInput,
  BreedingRecordUpdateInput,
  BreedingRecordWithNames,
  BreedingTheory,
} from '../types';
import type { Horse } from '@/features/horses/types';

export function BreedingRecordFormDialog({
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
            if (e.key === 'Enter') {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.currentTarget.requestSubmit();
              } else {
                e.preventDefault();
              }
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
