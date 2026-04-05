import { useState } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type {
  RacePlanWithHorseName,
  Country,
  Surface,
  DistanceBand,
  Grade,
  ClassicPath,
} from '../types';
import {
  COUNTRIES,
  DISTANCE_BANDS,
  GRADES,
  COUNTRY_SURFACES,
  COUNTRY_CLASSIC_PATHS,
} from '../types';
import { Badge } from '@/components/ui/badge';
import { HorseSelectDialog } from './HorseSelectDialog';

interface RacePlanMatrixProps {
  plans: RacePlanWithHorseName[];
  horseRepository: HorseRepository;
  onAdd: (data: {
    horseId: number;
    country: string;
    surface: string;
    distanceBand?: string | null;
    classicPath?: string | null;
    grade?: string | null;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

interface CellTarget {
  country: Country;
  surface: Surface;
  distanceBand?: DistanceBand | null;
  classicPath?: ClassicPath | null;
  grade?: Grade | null;
}

function getPlansForCell(
  plans: RacePlanWithHorseName[],
  country: Country,
  surface: Surface,
  distanceBand: DistanceBand | null,
  grade: Grade | null,
): RacePlanWithHorseName[] {
  return plans.filter(
    (p) =>
      p.country === country &&
      p.surface === surface &&
      p.distanceBand === distanceBand &&
      p.grade === grade,
  );
}

function getPlansForClassic(
  plans: RacePlanWithHorseName[],
  country: Country,
  surface: Surface,
  classicPath: ClassicPath,
): RacePlanWithHorseName[] {
  return plans.filter(
    (p) =>
      p.country === country &&
      p.surface === surface &&
      p.distanceBand === null &&
      p.grade === null &&
      p.notes === classicPath,
  );
}

export function RacePlanMatrix({ plans, horseRepository, onAdd, onDelete }: RacePlanMatrixProps) {
  const [selectTarget, setSelectTarget] = useState<CellTarget | null>(null);
  const [activeSurface, setActiveSurface] = useState<Surface>('芝');

  const handleCellClick = (target: CellTarget) => {
    setSelectTarget(target);
  };

  const handleHorseSelect = async (horseId: number) => {
    if (!selectTarget) return;
    await onAdd({
      horseId,
      country: selectTarget.country,
      surface: selectTarget.surface,
      distanceBand: selectTarget.distanceBand,
      classicPath: selectTarget.classicPath,
      grade: selectTarget.grade,
    });
    setSelectTarget(null);
  };

  const cellLabel = selectTarget
    ? selectTarget.classicPath
      ? `${selectTarget.country} ${selectTarget.surface} ${selectTarget.classicPath}`
      : `${selectTarget.country} ${selectTarget.surface} ${selectTarget.distanceBand} ${selectTarget.grade}`
    : '';

  return (
    <div className="space-y-6">
      {/* 芝/ダート切替タブ */}
      <div className="flex gap-2 border-b" role="tablist" aria-label="馬場選択">
        {(['芝', 'ダート'] as Surface[]).map((surface) => (
          <button
            key={surface}
            role="tab"
            aria-selected={activeSurface === surface}
            className={`px-4 py-2 text-sm font-medium ${
              activeSurface === surface
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveSurface(surface)}
          >
            {surface}
          </button>
        ))}
      </div>

      {COUNTRIES.map((country) => {
        const surfaces = COUNTRY_SURFACES[country];
        if (!surfaces.includes(activeSurface)) return null;

        const classicPaths = COUNTRY_CLASSIC_PATHS[country];

        return (
          <div key={country}>
            <h2 className="mb-2 text-lg font-semibold">{country}</h2>

            {/* クラシック路線（3歳限定） */}
            {classicPaths.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">
                  3歳クラシック路線
                </h3>
                <div className="flex flex-wrap gap-2">
                  {classicPaths.map((classicPath) => {
                    const cellPlans = getPlansForClassic(
                      plans,
                      country,
                      activeSurface,
                      classicPath,
                    );
                    return (
                      <div
                        key={classicPath}
                        className="min-w-32 cursor-pointer rounded-md border p-2 hover:bg-muted/50"
                        onClick={() =>
                          handleCellClick({
                            country,
                            surface: activeSurface,
                            classicPath,
                          })
                        }
                        role="gridcell"
                        aria-label={`${country} ${activeSurface} ${classicPath}`}
                      >
                        <div className="mb-1 text-xs font-medium">{classicPath}</div>
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
                          {cellPlans.length === 0 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 通常マトリクス */}
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
                        const cellPlans = getPlansForCell(
                          plans,
                          country,
                          activeSurface,
                          distanceBand,
                          grade,
                        );
                        return (
                          <td
                            key={grade}
                            className="min-w-32 cursor-pointer border p-2 align-top hover:bg-muted/50"
                            onClick={() =>
                              handleCellClick({
                                country,
                                surface: activeSurface,
                                distanceBand,
                                grade,
                              })
                            }
                            role="gridcell"
                            aria-label={`${country} ${activeSurface} ${distanceBand} ${grade}`}
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
        );
      })}

      <HorseSelectDialog
        open={selectTarget !== null}
        onOpenChange={(open) => !open && setSelectTarget(null)}
        horseRepository={horseRepository}
        onSelect={handleHorseSelect}
        cellLabel={cellLabel}
      />
    </div>
  );
}
