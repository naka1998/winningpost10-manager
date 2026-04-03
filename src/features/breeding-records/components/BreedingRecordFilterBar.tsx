import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BreedingRecordFilter } from '../types';
import type { Horse } from '@/features/horses/types';

export function BreedingRecordFilterBar({
  filter,
  mares,
  stallions,
  onFilterChange,
}: {
  filter: BreedingRecordFilter;
  mares: Horse[];
  stallions: Horse[];
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-4">
      <div>
        <Label htmlFor="filter-mare">繁殖牝馬</Label>
        <Select
          value={filter.mareId != null ? String(filter.mareId) : 'all'}
          onValueChange={(v) => onFilterChange('mareId', v === 'all' ? '' : v)}
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
          onValueChange={(v) => onFilterChange('sireId', v === 'all' ? '' : v)}
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
          onChange={(e) => onFilterChange('year', e.target.value)}
          placeholder="すべて"
        />
      </div>
    </div>
  );
}
