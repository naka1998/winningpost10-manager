import { useEffect, useRef, useState } from 'react';
import type { HorseRepository } from '@/features/horses/repository';
import type { Horse } from '@/features/horses/types';
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
  COUNTRY_SURFACE_CLASSIC_PATHS,
} from '../types';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FILLY_ONLY_CLASSICS: ClassicPath[] = ['牝馬三冠', 'トリプルティアラ'];

function getBadgeClassName(
  horseSex: string | null,
  horseBirthYear: number | null,
  currentYear: number,
): string {
  const isYoung = horseBirthYear !== null && horseBirthYear >= currentYear - 3;
  const isMale = horseSex === '牡';
  if (isYoung && isMale)
    return 'cursor-pointer border-transparent bg-blue-600 text-white hover:bg-blue-600/80';
  if (isYoung && !isMale)
    return 'cursor-pointer border-transparent bg-pink-600 text-white hover:bg-pink-600/80';
  if (!isYoung && isMale)
    return 'cursor-pointer border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100/80';
  return 'cursor-pointer border-transparent bg-pink-100 text-pink-800 hover:bg-pink-100/80';
}

interface RacePlanMatrixProps {
  plans: RacePlanWithHorseName[];
  horseRepository: HorseRepository;
  year: number;
  onAdd: (data: {
    horseId: number;
    country: string;
    surface: string;
    distanceBand?: string | null;
    classicPath?: string | null;
    grade?: string | null;
    notes?: string;
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

function cellKey(target: CellTarget): string {
  return `${target.country}-${target.surface}-${target.distanceBand ?? target.classicPath}-${target.grade ?? ''}`;
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
      p.distanceBand === classicPath &&
      p.grade === null,
  );
}

/** Inline select that appears inside a cell. Opens immediately and supports continuous adding. */
function InlineCellSelect({
  horses,
  onSelect,
  onCancel,
}: {
  horses: Horse[];
  onSelect: (horseId: number) => void;
  onCancel: () => void;
}) {
  const [selectKey, setSelectKey] = useState(0);
  const justSelected = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Auto-open: click the trigger programmatically on mount and after each selection
    triggerRef.current?.click();
  }, [selectKey]);

  const handleValueChange = (value: string) => {
    justSelected.current = true;
    onSelect(Number(value));
    // Remount Select to reset and reopen immediately for next selection
    setSelectKey((k) => k + 1);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (!justSelected.current) {
        onCancel();
      }
      justSelected.current = false;
    }
  };

  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <Select key={selectKey} onValueChange={handleValueChange} onOpenChange={handleOpenChange}>
        <SelectTrigger ref={triggerRef} className="h-7 text-xs">
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
  );
}

export function RacePlanMatrix({
  plans,
  horseRepository,
  year,
  onAdd,
  onDelete,
}: RacePlanMatrixProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [activeCellTarget, setActiveCellTarget] = useState<CellTarget | null>(null);
  const [activeSurface, setActiveSurface] = useState<Surface>('芝');
  const [filteredHorses, setFilteredHorses] = useState<Horse[]>([]);

  useEffect(() => {
    if (!activeCellTarget) return;
    horseRepository.findAll({ status: '現役' }).then((allHorses) => {
      const sortHorses = (horses: Horse[]) =>
        [...horses].sort((a, b) => {
          // 1. 馬齢降順（birthYear昇順 = 年上が先）
          const aBirth = a.birthYear ?? 0;
          const bBirth = b.birthYear ?? 0;
          if (aBirth !== bBirth) return aBirth - bBirth;
          // 2. 牡馬が先、牝馬が後
          const sexOrder = (sex: string | null) => (sex === '牡' ? 0 : 1);
          if (a.sex !== b.sex) return sexOrder(a.sex) - sexOrder(b.sex);
          // 3. 馬名あいうえお順
          return a.name.localeCompare(b.name, 'ja');
        });

      if (activeCellTarget.classicPath) {
        const targetBirthYear = year - 3;
        const isFillyOnly = FILLY_ONLY_CLASSICS.includes(
          activeCellTarget.classicPath as ClassicPath,
        );
        setFilteredHorses(
          sortHorses(
            allHorses.filter((h) => {
              if (h.birthYear !== targetBirthYear) return false;
              if (isFillyOnly && h.sex !== '牝') return false;
              return true;
            }),
          ),
        );
      } else {
        setFilteredHorses(sortHorses(allHorses));
      }
    });
  }, [activeCellTarget, horseRepository, year]);

  const handleCellClick = (target: CellTarget) => {
    const key = cellKey(target);
    if (activeCell === key) {
      setActiveCell(null);
      setActiveCellTarget(null);
    } else {
      setActiveCell(key);
      setActiveCellTarget(target);
    }
  };

  const handleHorseSelect = async (horseId: number) => {
    if (!activeCellTarget) return;
    await onAdd({
      horseId,
      country: activeCellTarget.country,
      surface: activeCellTarget.surface,
      distanceBand: activeCellTarget.distanceBand,
      classicPath: activeCellTarget.classicPath,
      grade: activeCellTarget.grade,
    });
    // セルを開いたままにして連続で馬を追加可能にする
  };

  const handleCancel = () => {
    setActiveCell(null);
    setActiveCellTarget(null);
  };

  const renderCellContent = (cellPlans: RacePlanWithHorseName[], target: CellTarget) => {
    const key = cellKey(target);
    const isActive = activeCell === key;
    return (
      <>
        <div className="flex flex-col gap-1">
          {cellPlans.map((plan) => (
            <Badge
              key={plan.id}
              className={getBadgeClassName(plan.horseSex, plan.horseBirthYear, year)}
              title={plan.notes ?? undefined}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(plan.id);
              }}
            >
              {plan.horseName}
              {plan.notes && <span className="ml-1 text-xs opacity-70">({plan.notes})</span>} ✕
            </Badge>
          ))}
        </div>
        {isActive ? (
          <InlineCellSelect
            horses={filteredHorses}
            onSelect={handleHorseSelect}
            onCancel={handleCancel}
          />
        ) : (
          cellPlans.length === 0 && <span className="text-xs text-muted-foreground">+</span>
        )}
      </>
    );
  };

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

        const classicPaths = COUNTRY_SURFACE_CLASSIC_PATHS[country]?.[activeSurface] ?? [];

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
                    const target: CellTarget = {
                      country,
                      surface: activeSurface,
                      classicPath,
                    };
                    return (
                      <div
                        key={classicPath}
                        className="min-w-32 cursor-pointer rounded-md border p-2 hover:bg-muted/50"
                        onClick={() => handleCellClick(target)}
                        role="gridcell"
                        aria-label={`${country} ${activeSurface} ${classicPath}`}
                      >
                        <div className="mb-1 text-xs font-medium">{classicPath}</div>
                        {renderCellContent(cellPlans, target)}
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
                        const target: CellTarget = {
                          country,
                          surface: activeSurface,
                          distanceBand,
                          grade,
                        };
                        return (
                          <td
                            key={grade}
                            className="min-w-32 cursor-pointer border p-2 align-top hover:bg-muted/50"
                            onClick={() => handleCellClick(target)}
                            role="gridcell"
                            aria-label={`${country} ${activeSurface} ${distanceBand} ${grade}`}
                          >
                            {renderCellContent(cellPlans, target)}
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
    </div>
  );
}
