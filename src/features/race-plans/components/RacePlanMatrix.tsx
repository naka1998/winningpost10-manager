import { useState } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { RacePlanWithHorseName, Country, DistanceBand, Grade } from '../types';
import { COUNTRIES, DISTANCE_BANDS, GRADES } from '../types';
import { Badge } from '@/components/ui/badge';
import { HorseSelectDialog } from './HorseSelectDialog';

interface RacePlanMatrixProps {
  plans: RacePlanWithHorseName[];
  horseRepository: HorseRepository;
  onAdd: (data: {
    horseId: number;
    country: string;
    distanceBand: string;
    grade: string;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

interface CellTarget {
  country: Country;
  distanceBand: DistanceBand;
  grade: Grade;
}

function getPlansForCell(
  plans: RacePlanWithHorseName[],
  country: Country,
  distanceBand: DistanceBand,
  grade: Grade,
): RacePlanWithHorseName[] {
  return plans.filter(
    (p) => p.country === country && p.distanceBand === distanceBand && p.grade === grade,
  );
}

export function RacePlanMatrix({ plans, horseRepository, onAdd, onDelete }: RacePlanMatrixProps) {
  const [selectTarget, setSelectTarget] = useState<CellTarget | null>(null);

  const handleCellClick = (country: Country, distanceBand: DistanceBand, grade: Grade) => {
    setSelectTarget({ country, distanceBand, grade });
  };

  const handleHorseSelect = async (horseId: number) => {
    if (!selectTarget) return;
    await onAdd({
      horseId,
      country: selectTarget.country,
      distanceBand: selectTarget.distanceBand,
      grade: selectTarget.grade,
    });
    setSelectTarget(null);
  };

  return (
    <div className="space-y-6">
      {COUNTRIES.map((country) => (
        <div key={country}>
          <h2 className="mb-2 text-lg font-semibold">{country}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border" role="grid">
              <thead>
                <tr>
                  <th className="border p-2 text-left text-sm font-medium">距離帯</th>
                  {GRADES.map((grade) => (
                    <th key={grade} className="border p-2 text-center text-sm font-medium">
                      {grade}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DISTANCE_BANDS.map((distanceBand) => (
                  <tr key={distanceBand}>
                    <td className="border p-2 text-sm font-medium">{distanceBand}</td>
                    {GRADES.map((grade) => {
                      const cellPlans = getPlansForCell(plans, country, distanceBand, grade);
                      return (
                        <td
                          key={grade}
                          className="min-w-32 cursor-pointer border p-2 align-top hover:bg-muted/50"
                          onClick={() => handleCellClick(country, distanceBand, grade)}
                          role="gridcell"
                          aria-label={`${country} ${distanceBand} ${grade}`}
                        >
                          <div className="flex flex-wrap gap-1">
                            {cellPlans.map((plan) => (
                              <Badge
                                key={plan.id}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(plan.id);
                                }}
                              >
                                {plan.horseName} ✕
                              </Badge>
                            ))}
                          </div>
                          {cellPlans.length === 0 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <HorseSelectDialog
        open={selectTarget !== null}
        onOpenChange={(open) => !open && setSelectTarget(null)}
        horseRepository={horseRepository}
        onSelect={handleHorseSelect}
        cellLabel={
          selectTarget
            ? `${selectTarget.country} ${selectTarget.distanceBand} ${selectTarget.grade}`
            : ''
        }
      />
    </div>
  );
}
