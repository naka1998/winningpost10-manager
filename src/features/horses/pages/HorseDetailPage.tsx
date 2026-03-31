import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useRepositoryContext } from '@/app/repository-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type {
  Horse,
  HorseUpdateInput,
  YearlyStatus,
  YearlyStatusCreateInput,
  YearlyStatusUpdateInput,
} from '../types';
import type { Lineage } from '@/features/lineages/types';

// --- YearlyStatus Form Dialog ---

function YearlyStatusFormDialog({
  open,
  onOpenChange,
  editTarget,
  horseId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget: YearlyStatus | null;
  horseId: number;
  onSubmit: (
    data: YearlyStatusCreateInput | (YearlyStatusUpdateInput & { id: number }),
  ) => Promise<void>;
}) {
  const [year, setYear] = useState('');
  const [spRank, setSpRank] = useState('');
  const [spValue, setSpValue] = useState('');
  const [powerRank, setPowerRank] = useState('');
  const [powerValue, setPowerValue] = useState('');
  const [instantRank, setInstantRank] = useState('');
  const [instantValue, setInstantValue] = useState('');
  const [staminaRank, setStaminaRank] = useState('');
  const [staminaValue, setStaminaValue] = useState('');
  const [mentalRank, setMentalRank] = useState('');
  const [mentalValue, setMentalValue] = useState('');
  const [wisdomRank, setWisdomRank] = useState('');
  const [wisdomValue, setWisdomValue] = useState('');
  const [subParams, setSubParams] = useState('');
  const [turfAptitude, setTurfAptitude] = useState('');
  const [dirtAptitude, setDirtAptitude] = useState('');
  const [turfQuality, setTurfQuality] = useState('');
  const [distanceMin, setDistanceMin] = useState('');
  const [distanceMax, setDistanceMax] = useState('');
  const [growthType, setGrowthType] = useState('');
  const [runningStyle, setRunningStyle] = useState('');
  const [traits, setTraits] = useState('');
  const [jockey, setJockey] = useState('');
  const [grade, setGrade] = useState('');
  const [raceRecord, setRaceRecord] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editTarget) {
      setYear(editTarget.year.toString());
      setSpRank(editTarget.spRank ?? '');
      setSpValue(editTarget.spValue?.toString() ?? '');
      setPowerRank(editTarget.powerRank ?? '');
      setPowerValue(editTarget.powerValue?.toString() ?? '');
      setInstantRank(editTarget.instantRank ?? '');
      setInstantValue(editTarget.instantValue?.toString() ?? '');
      setStaminaRank(editTarget.staminaRank ?? '');
      setStaminaValue(editTarget.staminaValue?.toString() ?? '');
      setMentalRank(editTarget.mentalRank ?? '');
      setMentalValue(editTarget.mentalValue?.toString() ?? '');
      setWisdomRank(editTarget.wisdomRank ?? '');
      setWisdomValue(editTarget.wisdomValue?.toString() ?? '');
      setSubParams(editTarget.subParams?.toString() ?? '');
      setTurfAptitude(editTarget.turfAptitude ?? '');
      setDirtAptitude(editTarget.dirtAptitude ?? '');
      setTurfQuality(editTarget.turfQuality ?? '');
      setDistanceMin(editTarget.distanceMin?.toString() ?? '');
      setDistanceMax(editTarget.distanceMax?.toString() ?? '');
      setGrowthType(editTarget.growthType ?? '');
      setRunningStyle(editTarget.runningStyle?.join('、') ?? '');
      setTraits(editTarget.traits?.join('、') ?? '');
      setJockey(editTarget.jockey ?? '');
      setGrade(editTarget.grade ?? '');
      setRaceRecord(editTarget.raceRecord ?? '');
      setNotes(editTarget.notes ?? '');
    } else {
      setYear('');
      setSpRank('');
      setSpValue('');
      setPowerRank('');
      setPowerValue('');
      setInstantRank('');
      setInstantValue('');
      setStaminaRank('');
      setStaminaValue('');
      setMentalRank('');
      setMentalValue('');
      setWisdomRank('');
      setWisdomValue('');
      setSubParams('');
      setTurfAptitude('');
      setDirtAptitude('');
      setTurfQuality('');
      setDistanceMin('');
      setDistanceMax('');
      setGrowthType('');
      setRunningStyle('');
      setTraits('');
      setJockey('');
      setGrade('');
      setRaceRecord('');
      setNotes('');
    }
    setFormError(null);
  }, [editTarget, open]);

  const parseArray = (val: string): string[] | null => {
    if (!val.trim()) return null;
    return val
      .split(/[、,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    const data = {
      horseId,
      year: Number(year),
      spRank: spRank || null,
      spValue: spValue ? Number(spValue) : null,
      powerRank: powerRank || null,
      powerValue: powerValue ? Number(powerValue) : null,
      instantRank: instantRank || null,
      instantValue: instantValue ? Number(instantValue) : null,
      staminaRank: staminaRank || null,
      staminaValue: staminaValue ? Number(staminaValue) : null,
      mentalRank: mentalRank || null,
      mentalValue: mentalValue ? Number(mentalValue) : null,
      wisdomRank: wisdomRank || null,
      wisdomValue: wisdomValue ? Number(wisdomValue) : null,
      subParams: subParams ? Number(subParams) : null,
      turfAptitude: turfAptitude || null,
      dirtAptitude: dirtAptitude || null,
      turfQuality: turfQuality || null,
      distanceMin: distanceMin ? Number(distanceMin) : null,
      distanceMax: distanceMax ? Number(distanceMax) : null,
      growthType: growthType || null,
      runningStyle: parseArray(runningStyle),
      traits: parseArray(traits),
      jockey: jockey || null,
      grade: grade || null,
      raceRecord: raceRecord || null,
      notes: notes || null,
    };

    try {
      if (editTarget) {
        const { horseId: _horseId, ...updateData } = data;
        await onSubmit({ id: editTarget.id, ...updateData });
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
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editTarget ? 'ステータスを編集' : 'ステータスを追加'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ys-year">年度</Label>
              <Input
                id="ys-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                disabled={!!editTarget}
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">能力値</legend>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="ys-sp-rank">SPランク</Label>
                <Input id="ys-sp-rank" value={spRank} onChange={(e) => setSpRank(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ys-sp-value">SP数値</Label>
                <Input
                  id="ys-sp-value"
                  type="number"
                  value={spValue}
                  onChange={(e) => setSpValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-power-rank">力ランク</Label>
                <Input
                  id="ys-power-rank"
                  value={powerRank}
                  onChange={(e) => setPowerRank(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-power-value">力数値</Label>
                <Input
                  id="ys-power-value"
                  type="number"
                  value={powerValue}
                  onChange={(e) => setPowerValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-instant-rank">瞬ランク</Label>
                <Input
                  id="ys-instant-rank"
                  value={instantRank}
                  onChange={(e) => setInstantRank(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-instant-value">瞬数値</Label>
                <Input
                  id="ys-instant-value"
                  type="number"
                  value={instantValue}
                  onChange={(e) => setInstantValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-stamina-rank">勝ランク</Label>
                <Input
                  id="ys-stamina-rank"
                  value={staminaRank}
                  onChange={(e) => setStaminaRank(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-stamina-value">勝数値</Label>
                <Input
                  id="ys-stamina-value"
                  type="number"
                  value={staminaValue}
                  onChange={(e) => setStaminaValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-mental-rank">精ランク</Label>
                <Input
                  id="ys-mental-rank"
                  value={mentalRank}
                  onChange={(e) => setMentalRank(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-mental-value">精数値</Label>
                <Input
                  id="ys-mental-value"
                  type="number"
                  value={mentalValue}
                  onChange={(e) => setMentalValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-wisdom-rank">賢ランク</Label>
                <Input
                  id="ys-wisdom-rank"
                  value={wisdomRank}
                  onChange={(e) => setWisdomRank(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-wisdom-value">賢数値</Label>
                <Input
                  id="ys-wisdom-value"
                  type="number"
                  value={wisdomValue}
                  onChange={(e) => setWisdomValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-sub-params">サブパラ</Label>
                <Input
                  id="ys-sub-params"
                  type="number"
                  value={subParams}
                  onChange={(e) => setSubParams(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">適性</legend>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="ys-turf">芝適性</Label>
                <Input
                  id="ys-turf"
                  value={turfAptitude}
                  onChange={(e) => setTurfAptitude(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-dirt">ダート適性</Label>
                <Input
                  id="ys-dirt"
                  value={dirtAptitude}
                  onChange={(e) => setDirtAptitude(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-turf-quality">芝質</Label>
                <Input
                  id="ys-turf-quality"
                  value={turfQuality}
                  onChange={(e) => setTurfQuality(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="ys-dist-min">距離下限(m)</Label>
                <Input
                  id="ys-dist-min"
                  type="number"
                  value={distanceMin}
                  onChange={(e) => setDistanceMin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-dist-max">距離上限(m)</Label>
                <Input
                  id="ys-dist-max"
                  type="number"
                  value={distanceMax}
                  onChange={(e) => setDistanceMax(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">成長・戦術</legend>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="ys-growth">成長型</Label>
                <Input
                  id="ys-growth"
                  value={growthType}
                  onChange={(e) => setGrowthType(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-running-style">脚質（カンマ区切り）</Label>
                <Input
                  id="ys-running-style"
                  value={runningStyle}
                  onChange={(e) => setRunningStyle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ys-traits">特性（カンマ区切り）</Label>
                <Input id="ys-traits" value={traits} onChange={(e) => setTraits(e.target.value)} />
              </div>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">運用情報</legend>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="ys-jockey">主戦騎手</Label>
                <Input id="ys-jockey" value={jockey} onChange={(e) => setJockey(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ys-grade">グレード</Label>
                <Input id="ys-grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ys-race-record">戦績</Label>
                <Input
                  id="ys-race-record"
                  value={raceRecord}
                  onChange={(e) => setRaceRecord(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
          <div>
            <Label htmlFor="ys-notes">備考</Label>
            <Input id="ys-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : editTarget ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Horse Basic Info Edit Dialog ---

function HorseEditDialog({
  open,
  onOpenChange,
  horse,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horse: Horse;
  onSubmit: (data: HorseUpdateInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [mareLine, setMareLine] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(horse.name);
    setSex(horse.sex ?? '');
    setBirthYear(horse.birthYear?.toString() ?? '');
    setCountry(horse.country ?? '');
    setStatus(horse.status);
    setMareLine(horse.mareLine ?? '');
    setNotes(horse.notes ?? '');
    setFormError(null);
  }, [horse, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      await onSubmit({
        name,
        sex: sex || null,
        birthYear: birthYear ? Number(birthYear) : null,
        country: country || null,
        status,
        mareLine: mareLine || null,
        notes: notes || null,
      });
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
          <DialogTitle>基本情報を編集</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-horse-name">馬名</Label>
            <Input
              id="edit-horse-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-horse-sex">性別</Label>
              <select
                id="edit-horse-sex"
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
              <Label htmlFor="edit-horse-birth-year">生年</Label>
              <Input
                id="edit-horse-birth-year"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-horse-country">国</Label>
              <select
                id="edit-horse-country"
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
              <Label htmlFor="edit-horse-status">ステータス</Label>
              <select
                id="edit-horse-status"
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
            <Label htmlFor="edit-horse-mare-line">牝系</Label>
            <Input
              id="edit-horse-mare-line"
              value={mareLine}
              onChange={(e) => setMareLine(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-horse-notes">備考</Label>
            <Input id="edit-horse-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : '更新'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Yearly Status Card ---

function YearlyStatusCard({
  status,
  onEdit,
  onDelete,
}: {
  status: YearlyStatus;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>{status.year}</CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="ステータスを編集">
            ステータスを編集
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="ステータスを削除">
            ステータスを削除
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 能力値テーブル */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SP</TableHead>
              <TableHead>力</TableHead>
              <TableHead>瞬</TableHead>
              <TableHead>勝</TableHead>
              <TableHead>精</TableHead>
              <TableHead>賢</TableHead>
              <TableHead>サブパラ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{formatRankValue(status.spRank, status.spValue)}</TableCell>
              <TableCell>{formatRankValue(status.powerRank, status.powerValue)}</TableCell>
              <TableCell>{formatRankValue(status.instantRank, status.instantValue)}</TableCell>
              <TableCell>{formatRankValue(status.staminaRank, status.staminaValue)}</TableCell>
              <TableCell>{formatRankValue(status.mentalRank, status.mentalValue)}</TableCell>
              <TableCell>{formatRankValue(status.wisdomRank, status.wisdomValue)}</TableCell>
              <TableCell>{status.subParams ?? '-'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* 適性・距離 */}
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-muted-foreground">芝: </span>
            <span>{status.turfAptitude ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">ダート: </span>
            <span>{status.dirtAptitude ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">芝質: </span>
            <span>{status.turfQuality ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">距離: </span>
            <span>
              {status.distanceMin != null && status.distanceMax != null
                ? `${status.distanceMin}m〜${status.distanceMax}m`
                : '-'}
            </span>
          </div>
        </div>

        {/* 成長型・脚質・特性 */}
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">成長型: </span>
            <span>{status.growthType ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">脚質: </span>
            {status.runningStyle?.map((s) => (
              <Badge key={s} variant="outline" className="mr-1">
                {s}
              </Badge>
            )) ?? '-'}
          </div>
          <div>
            <span className="text-muted-foreground">特性: </span>
            {status.traits?.map((t) => (
              <Badge key={t} variant="outline" className="mr-1">
                {t}
              </Badge>
            )) ?? '-'}
          </div>
        </div>

        {/* 運用情報 */}
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-muted-foreground">騎手: </span>
            <span>{status.jockey ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">グレード: </span>
            <span>{status.grade ?? '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">戦績: </span>
            <span>{status.raceRecord ?? '-'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRankValue(rank: string | null, value: number | null): string {
  if (rank && value != null) return `${rank} (${value})`;
  if (rank) return rank;
  if (value != null) return String(value);
  return '-';
}

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

// --- Main Page ---

export function HorseDetailPage() {
  const { horseId } = useParams({ strict: false });
  const { horseRepository, yearlyStatusRepository, lineageRepository } = useRepositoryContext();

  const [horse, setHorse] = useState<Horse | null>(null);
  const [yearlyStatuses, setYearlyStatuses] = useState<YearlyStatus[]>([]);
  const [sire, setSire] = useState<Horse | null>(null);
  const [dam, setDam] = useState<Horse | null>(null);
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ysDialogOpen, setYsDialogOpen] = useState(false);
  const [ysEditTarget, setYsEditTarget] = useState<YearlyStatus | null>(null);
  const [ysDeleteTarget, setYsDeleteTarget] = useState<YearlyStatus | null>(null);

  const id = Number(horseId);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const h = await horseRepository.findById(id);
      setHorse(h);
      if (!h) {
        setIsInitialLoad(false);
        return;
      }

      // wa-sqlite は並行アクセスに対応していないため、DB操作を直列化する
      const statuses = await yearlyStatusRepository.findByHorseId(id);
      const s = h.sireId ? await horseRepository.findById(h.sireId) : null;
      const d = h.damId ? await horseRepository.findById(h.damId) : null;
      const l = h.lineageId ? await lineageRepository.findById(h.lineageId) : null;

      setYearlyStatuses(statuses);
      setSire(s);
      setDam(d);
      setLineage(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsInitialLoad(false);
    }
  }, [id, horseRepository, yearlyStatusRepository, lineageRepository]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateHorse = async (data: HorseUpdateInput) => {
    await horseRepository.update(id, data);
    await loadData();
  };

  const handleYsSubmit = async (
    data: YearlyStatusCreateInput | (YearlyStatusUpdateInput & { id: number }),
  ) => {
    if ('id' in data) {
      const { id: ysId, ...updateData } = data;
      await yearlyStatusRepository.update(ysId, updateData);
    } else {
      await yearlyStatusRepository.create(data);
    }
    await loadData();
  };

  const handleYsDelete = async () => {
    if (!ysDeleteTarget) return;
    await yearlyStatusRepository.delete(ysDeleteTarget.id);
    setYsDeleteTarget(null);
    await loadData();
  };

  if (isInitialLoad) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!horse) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">馬が見つかりません</p>
        <Link to="/horses" className="mt-2 inline-block text-blue-600 hover:underline">
          馬一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/horses" className="text-sm text-blue-600 hover:underline">
            ← 馬一覧
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{horse.name}</h1>
        </div>
        <Button onClick={() => setEditDialogOpen(true)}>基本情報を編集</Button>
      </div>

      {/* D1: 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">性別</dt>
              <dd>{horse.sex ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">生年</dt>
              <dd>{horse.birthYear ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">国</dt>
              <dd>{horse.country ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">区分</dt>
              <dd>{horse.isHistorical ? '史実馬' : '自家生産馬'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">牝系</dt>
              <dd>{horse.mareLine ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ステータス</dt>
              <dd>
                <Badge className={statusBadgeClass(horse.status)}>{horse.status}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* D2: 年度別ステータス */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">年度別ステータス</h2>
          <Button
            onClick={() => {
              setYsEditTarget(null);
              setYsDialogOpen(true);
            }}
          >
            ステータスを追加
          </Button>
        </div>
        {yearlyStatuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">年度別ステータスがありません</p>
        ) : (
          <div className="space-y-4">
            {yearlyStatuses.map((ys) => (
              <YearlyStatusCard
                key={ys.id}
                status={ys}
                onEdit={() => {
                  setYsEditTarget(ys);
                  setYsDialogOpen(true);
                }}
                onDelete={() => setYsDeleteTarget(ys)}
              />
            ))}
          </div>
        )}
      </div>

      {/* D3: 血統情報 */}
      <Card>
        <CardHeader>
          <CardTitle>血統情報</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">父馬</dt>
              <dd>
                {sire ? (
                  <Link
                    to="/horses/$horseId"
                    params={{ horseId: sire.id }}
                    className="text-blue-600 hover:underline"
                  >
                    {sire.name}
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">母馬</dt>
              <dd>
                {dam ? (
                  <Link
                    to="/horses/$horseId"
                    params={{ horseId: dam.id }}
                    className="text-blue-600 hover:underline"
                  >
                    {dam.name}
                  </Link>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">系統</dt>
              <dd>{lineage?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">因子</dt>
              <dd>
                {horse.factors?.map((f) => (
                  <Badge key={f} variant="outline" className="mr-1">
                    {f}
                  </Badge>
                )) ?? '-'}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <Link
              to="/horses/$horseId/pedigree"
              params={{ horseId: horse.id }}
              className="text-blue-600 hover:underline"
            >
              血統ツリーを見る →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {horse && (
        <HorseEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          horse={horse}
          onSubmit={handleUpdateHorse}
        />
      )}

      <YearlyStatusFormDialog
        open={ysDialogOpen}
        onOpenChange={setYsDialogOpen}
        editTarget={ysEditTarget}
        horseId={id}
        onSubmit={handleYsSubmit}
      />

      <ConfirmDialog
        open={ysDeleteTarget !== null}
        title="ステータスの削除"
        description={`${ysDeleteTarget?.year}年のステータスを削除しますか？この操作は取り消せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        variant="destructive"
        onConfirm={handleYsDelete}
        onCancel={() => setYsDeleteTarget(null)}
      />
    </div>
  );
}
