import { useEffect, useState } from 'react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Horse, HorseCreateInput, HorseUpdateInput } from '../types';
import type { Lineage } from '@/features/lineages/types';

export function HorseFormDialog({
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
