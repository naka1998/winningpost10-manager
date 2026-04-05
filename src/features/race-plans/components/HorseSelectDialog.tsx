import { useEffect, useState } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { Horse } from '@/features/horses/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HorseSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horseRepository: HorseRepository;
  onSelect: (horseId: number) => void;
  cellLabel: string;
}

export function HorseSelectDialog({
  open,
  onOpenChange,
  horseRepository,
  onSelect,
  cellLabel,
}: HorseSelectDialogProps) {
  const [horses, setHorses] = useState<Horse[]>([]);

  useEffect(() => {
    if (!open) return;
    horseRepository.findAll({ status: '現役' }).then(setHorses);
  }, [open, horseRepository]);

  const handleSelect = (value: string) => {
    onSelect(Number(value));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>馬を配置: {cellLabel}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={handleSelect}>
            <SelectTrigger>
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
      </DialogContent>
    </Dialog>
  );
}
