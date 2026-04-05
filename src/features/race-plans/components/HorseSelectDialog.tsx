import { useEffect, useState } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { Horse } from '@/features/horses/types';
import type { ClassicPath } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const FILLY_ONLY_CLASSICS: ClassicPath[] = ['牝馬三冠', 'トリプルティアラ'];

interface HorseSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseRepository: HorseRepository;
  onSelect: (horseId: number, notes?: string) => void;
  cellLabel: string;
  classicPath?: ClassicPath | string | null;
  year?: number;
}

export function HorseSelectDialog({
  open,
  onOpenChange,
  horseRepository,
  onSelect,
  cellLabel,
  classicPath,
  year,
}: HorseSelectDialogProps) {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseId, setSelectedHorseId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedHorseId('');
    setNotes('');
    horseRepository.findAll({ status: '現役' }).then((allHorses) => {
      if (classicPath && year) {
        const targetBirthYear = year - 3;
        const isFillyOnly = FILLY_ONLY_CLASSICS.includes(classicPath as ClassicPath);
        const filtered = allHorses.filter((h) => {
          if (h.birthYear !== targetBirthYear) return false;
          if (isFillyOnly && h.sex !== '牝') return false;
          return true;
        });
        setHorses(filtered);
      } else {
        setHorses(allHorses);
      }
    });
  }, [open, horseRepository, classicPath, year]);

  const handleSubmit = () => {
    if (!selectedHorseId) return;
    onSelect(Number(selectedHorseId), notes || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>馬を配置: {cellLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="horse-select">馬</Label>
            <Select value={selectedHorseId} onValueChange={setSelectedHorseId}>
              <SelectTrigger id="horse-select">
                <SelectValue placeholder="馬を選択..." />
              </SelectTrigger>
              <SelectContent>
                {horses.map((horse) => (
                  <SelectItem key={horse.id} value={String(horse.id)}>
                    {horse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes-input">メモ</Label>
            <Input
              id="notes-input"
              placeholder="メモ（任意）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={!selectedHorseId} className="w-full">
            配置する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
