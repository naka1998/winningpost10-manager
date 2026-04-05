import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useRepositoryContext } from '@/app/repository-context';
import { useRacePlanStore } from '../store';
import { RacePlanMatrix } from '../components/RacePlanMatrix';
import { OverlapWarning } from '../components/OverlapWarning';
import type { Country, Surface, DistanceBand, Grade, ClassicPath } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => 2020 + i);

export function RacePlanPage() {
  const { year } = useParams({ strict: false }) as { year: number };
  const navigate = useNavigate();
  const { racePlanRepository, horseRepository, yearlyStatusRepository } = useRepositoryContext();
  const plans = useRacePlanStore((s) => s.plans);
  const isLoading = useRacePlanStore((s) => s.isLoading);
  const error = useRacePlanStore((s) => s.error);
  const getDuplicateHorses = useRacePlanStore((s) => s.getDuplicateHorses);

  useEffect(() => {
    useRacePlanStore.getState().setYear(year);
    useRacePlanStore.getState().loadPlans(racePlanRepository);
  }, [year, racePlanRepository]);

  const handleYearChange = (value: string) => {
    navigate({ to: '/race-plans/$year', params: { year: Number(value) } });
  };

  const handleCreate = async (data: {
    horseId: number;
    country: string;
    surface: string;
    distanceBand?: string | null;
    classicPath?: string | null;
    grade?: string | null;
    notes?: string;
  }) => {
    await useRacePlanStore.getState().createPlan(racePlanRepository, {
      horseId: data.horseId,
      year,
      country: data.country as Country,
      surface: data.surface as Surface,
      distanceBand: (data.distanceBand as DistanceBand) ?? undefined,
      classicPath: (data.classicPath as ClassicPath) ?? undefined,
      grade: (data.grade as Grade) ?? undefined,
      notes: data.notes,
    });
  };

  const handleDelete = async (id: number) => {
    await useRacePlanStore.getState().deletePlan(racePlanRepository, id);
  };

  if (isLoading && plans.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold">レース計画</h1>
        <p className="mt-4 text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">レース計画</h1>
        <p className="mt-4 text-destructive">{error}</p>
      </div>
    );
  }

  const duplicates = getDuplicateHorses();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">レース計画</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="year-select" className="text-sm font-medium">
            年度:
          </label>
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger id="year-select" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {duplicates.length > 0 && <OverlapWarning duplicates={duplicates} />}

      <RacePlanMatrix
        plans={plans}
        horseRepository={horseRepository}
        yearlyStatusRepository={yearlyStatusRepository}
        year={year}
        onAdd={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  );
}
