import { useEffect, useRef, useState } from 'react';
import { toKatakana } from 'wanakana';
import type { HorseRepository } from '@/features/horses/repository';
import type { YearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import type { Horse, YearlyStatus } from '@/features/horses/types';
import type {
  RacePlanWithHorseName,
  RacePlanUpdateInput,
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
import { hasSurfaceAptitude, hasDistanceAptitude } from '../aptitude-filter';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const FILLY_ONLY_CLASSICS: ClassicPath[] = ['牝馬三冠', 'トリプルティアラ'];

interface DraggingPlan {
  planId: number;
  horseSex: string | null;
  horseBirthYear: number | null;
  sourceCellKey: string;
}

function isDropAllowed(
  target: CellTarget,
  horseSex: string | null,
  horseBirthYear: number | null,
  year: number,
): boolean {
  if (target.classicPath) {
    if (horseBirthYear !== year - 3) return false;
    if (FILLY_ONLY_CLASSICS.includes(target.classicPath) && horseSex !== '牝') return false;
  }
  return true;
}

function cellTargetToUpdateInput(target: CellTarget, surface: Surface): RacePlanUpdateInput {
  if (target.classicPath) {
    return { country: target.country, surface, classicPath: target.classicPath };
  }
  return {
    country: target.country,
    surface,
    distanceBand: target.distanceBand ?? undefined,
    grade: target.grade ?? undefined,
  };
}

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
  yearlyStatusRepository: YearlyStatusRepository;
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
  onUpdate: (id: number, data: RacePlanUpdateInput) => Promise<void>;
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

/** Inline memo edit input for existing horse badges. */
function MemoEditInput({
  initialNotes,
  onSubmit,
  onCancel,
}: {
  initialNotes: string;
  onSubmit: (notes: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (value: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(value);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialNotes}
      className="h-6 w-full rounded border px-1 text-xs"
      placeholder="メモを入力してEnter"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          handleSubmit((e.target as HTMLInputElement).value);
        } else if (e.key === 'Escape') {
          onCancel();
        }
      }}
      onBlur={(e) => {
        handleSubmit(e.target.value);
      }}
    />
  );
}

/** Searchable horse select that appears inside a cell. */
export function SearchableHorseSelect({
  horses,
  onSelect,
}: {
  horses: Horse[];
  onSelect: (horseId: number) => void | Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = query
    ? horses.filter((h) => {
        const normalizedName = toKatakana(h.name.toLowerCase());
        const normalizedQuery = toKatakana(query.toLowerCase());
        return normalizedName.includes(normalizedQuery);
      })
    : horses;

  return (
    <div className="mt-1 w-36" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        placeholder="馬名で検索..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-7 w-full rounded border border-input bg-transparent px-2 text-xs shadow-sm focus:ring-1 focus:ring-ring focus:outline-none"
      />
      <div
        role="listbox"
        className="relative z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        {filtered.map((horse) => (
          <button
            key={horse.id}
            role="option"
            onClick={() => onSelect(horse.id)}
            className="relative flex w-full cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
          >
            {horse.name}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">該当なし</div>
        )}
      </div>
    </div>
  );
}

export function RacePlanMatrix({
  plans,
  horseRepository,
  yearlyStatusRepository,
  year,
  onAdd,
  onDelete,
  onUpdate,
}: RacePlanMatrixProps) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [activeCellTarget, setActiveCellTarget] = useState<CellTarget | null>(null);
  const [activeSurface, setActiveSurface] = useState<Surface>('芝');
  const [filteredHorses, setFilteredHorses] = useState<Horse[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [draggingPlan, setDraggingPlan] = useState<DraggingPlan | null>(null);
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (confirmingDeleteId === null) return;
    const timer = setTimeout(() => setConfirmingDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDeleteId]);

  useEffect(() => {
    if (!activeCellTarget) return;

    // wa-sqlite does not support concurrent queries on the same connection,
    // so we must run them sequentially
    horseRepository.findAll({ status: '現役' }).then(async (allHorses) => {
      const yearlyStatuses = await yearlyStatusRepository.findLatestByYear(year);
      const statusByHorseId = new Map<number, YearlyStatus>();
      for (const s of yearlyStatuses) {
        statusByHorseId.set(s.horseId, s);
      }

      const sortHorses = (horses: Horse[]) =>
        [...horses].sort((a, b) => {
          const aBirth = a.birthYear ?? 0;
          const bBirth = b.birthYear ?? 0;
          if (aBirth !== bBirth) return aBirth - bBirth;
          const sexOrder = (sex: string | null) => (sex === '牡' ? 0 : 1);
          if (a.sex !== b.sex) return sexOrder(a.sex) - sexOrder(b.sex);
          return a.name.localeCompare(b.name, 'ja');
        });

      const filterByAptitude = (horses: Horse[]) =>
        horses.filter((h) => {
          const status = statusByHorseId.get(h.id);
          // 馬場適性フィルタ
          if (!hasSurfaceAptitude(status, activeCellTarget.surface)) return false;
          // 距離適性フィルタ（通常セルのみ、クラシック路線は距離帯なし）
          if (activeCellTarget.distanceBand) {
            if (!hasDistanceAptitude(status, activeCellTarget.distanceBand)) return false;
          }
          return true;
        });

      if (activeCellTarget.classicPath) {
        const targetBirthYear = year - 3;
        const isFillyOnly = FILLY_ONLY_CLASSICS.includes(
          activeCellTarget.classicPath as ClassicPath,
        );
        setFilteredHorses(
          sortHorses(
            filterByAptitude(
              allHorses.filter((h) => {
                if (h.birthYear !== targetBirthYear) return false;
                if (isFillyOnly && h.sex !== '牝') return false;
                return true;
              }),
            ),
          ),
        );
      } else {
        setFilteredHorses(sortHorses(filterByAptitude(allHorses)));
      }
    });
  }, [activeCellTarget, horseRepository, yearlyStatusRepository, year]);

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
  };

  const handleDragStart = (e: React.DragEvent, plan: RacePlanWithHorseName, target: CellTarget) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ planId: plan.id }));
    setDraggingPlan({
      planId: plan.id,
      horseSex: plan.horseSex,
      horseBirthYear: plan.horseBirthYear,
      sourceCellKey: cellKey(target),
    });
  };

  const handleDragEnd = () => {
    setDraggingPlan(null);
    setDragOverCellKey(null);
  };

  const handleDragOver = (e: React.DragEvent, target: CellTarget) => {
    if (!draggingPlan) return;
    if (!isDropAllowed(target, draggingPlan.horseSex, draggingPlan.horseBirthYear, year)) return;
    e.preventDefault();
    setDragOverCellKey(cellKey(target));
  };

  const handleDragLeave = (e: React.DragEvent, target: CellTarget) => {
    // Ignore leave events when moving to a child element within the same cell
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverCellKey === cellKey(target)) {
      setDragOverCellKey(null);
    }
  };

  const handleDrop = (e: React.DragEvent, target: CellTarget) => {
    e.preventDefault();
    setDragOverCellKey(null);
    if (!draggingPlan) return;
    // Skip if dropped on the same cell
    if (draggingPlan.sourceCellKey === cellKey(target)) return;
    onUpdate(draggingPlan.planId, cellTargetToUpdateInput(target, activeSurface));
    setDraggingPlan(null);
  };

  const handleMemoSubmit = (planId: number, notes: string) => {
    setEditingPlanId(null);
    onUpdate(planId, { notes });
  };

  const renderCellContent = (cellPlans: RacePlanWithHorseName[], target: CellTarget) => {
    const key = cellKey(target);
    const isActive = activeCell === key;
    return (
      <>
        <div className="flex flex-wrap gap-1">
          {cellPlans.map((plan) =>
            editingPlanId === plan.id ? (
              <MemoEditInput
                key={plan.id}
                initialNotes={plan.notes ?? ''}
                onSubmit={(notes) => handleMemoSubmit(plan.id, notes)}
                onCancel={() => setEditingPlanId(null)}
              />
            ) : confirmingDeleteId === plan.id ? (
              <Badge
                key={plan.id}
                className="border-transparent bg-red-600 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                削除?
                <button
                  className="ml-1 font-bold"
                  aria-label="削除確定"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDeleteId(null);
                    onDelete(plan.id);
                  }}
                >
                  ✓
                </button>
                <button
                  className="ml-1"
                  aria-label="削除キャンセル"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDeleteId(null);
                  }}
                >
                  ✕
                </button>
              </Badge>
            ) : (
              <Badge
                key={plan.id}
                draggable
                onDragStart={(e) => handleDragStart(e, plan, target)}
                onDragEnd={handleDragEnd}
                className={cn(
                  getBadgeClassName(plan.horseSex, plan.horseBirthYear, year),
                  draggingPlan?.planId === plan.id && 'opacity-50',
                )}
                title={plan.notes ?? undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  // Delay single click to distinguish from double click
                  if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
                  clickTimerRef.current = setTimeout(() => {
                    clickTimerRef.current = null;
                    setEditingPlanId(plan.id);
                  }, 250);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (clickTimerRef.current) {
                    clearTimeout(clickTimerRef.current);
                    clickTimerRef.current = null;
                  }
                  setConfirmingDeleteId(plan.id);
                }}
              >
                {plan.horseName}
                {plan.notes && <span className="ml-1 text-xs opacity-70">({plan.notes})</span>}
              </Badge>
            ),
          )}
        </div>
        {isActive ? (
          <SearchableHorseSelect horses={filteredHorses} onSelect={handleHorseSelect} />
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
                        className={cn(
                          'min-w-32 cursor-pointer rounded-md border p-2 hover:bg-muted/50',
                          dragOverCellKey === cellKey(target) && 'bg-accent/30 ring-2 ring-accent',
                        )}
                        onClick={() => handleCellClick(target)}
                        onDragOver={(e) => handleDragOver(e, target)}
                        onDragLeave={(e) => handleDragLeave(e, target)}
                        onDrop={(e) => handleDrop(e, target)}
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
                            className={cn(
                              'min-w-32 cursor-pointer border p-2 align-top hover:bg-muted/50',
                              dragOverCellKey === cellKey(target) &&
                                'bg-accent/30 ring-2 ring-accent',
                            )}
                            onClick={() => handleCellClick(target)}
                            onDragOver={(e) => handleDragOver(e, target)}
                            onDragLeave={(e) => handleDragLeave(e, target)}
                            onDrop={(e) => handleDrop(e, target)}
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
