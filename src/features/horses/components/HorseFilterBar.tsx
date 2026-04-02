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
import { SORT_OPTIONS } from '../constants';
import type { HorseFilter } from '../types';
import type { Lineage } from '@/features/lineages/types';

export function HorseFilterBar({
  filter,
  allLineages,
  onFilterChange,
}: {
  filter: HorseFilter;
  allLineages: Lineage[];
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <div>
        <Label>性別フィルタ</Label>
        <ToggleGroup
          type="single"
          value={filter.sex ?? 'all'}
          onValueChange={(v) => onFilterChange('sex', v === 'all' ? '' : v)}
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
          onValueChange={(v) => onFilterChange('lineageId', v === 'all' ? '' : v)}
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
          onChange={(e) => onFilterChange('birthYearFrom', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="filter-birth-year-to">生年（まで）</Label>
        <Input
          id="filter-birth-year-to"
          type="number"
          placeholder="例: 2025"
          value={filter.birthYearTo?.toString() ?? ''}
          onChange={(e) => onFilterChange('birthYearTo', e.target.value)}
        />
      </div>
      <div>
        <Label>ソート</Label>
        <Select value={filter.sortBy ?? 'name'} onValueChange={(v) => onFilterChange('sortBy', v)}>
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
}
