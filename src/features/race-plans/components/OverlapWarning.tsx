import type { DuplicateHorseWarning } from '../types';

interface OverlapWarningProps {
  duplicates: DuplicateHorseWarning[];
}

function formatCellLocation(c: DuplicateHorseWarning['cells'][number]): string {
  if (c.distanceBand && c.grade) {
    return `${c.country}/${c.surface}/${c.distanceBand}/${c.grade}`;
  }
  return `${c.country}/${c.surface}/${c.classicPath ?? ''}`;
}

export function OverlapWarning({ duplicates }: OverlapWarningProps) {
  if (duplicates.length === 0) return null;

  return (
    <div
      className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-950"
      role="alert"
    >
      <h3 className="mb-2 text-sm font-semibold text-yellow-800 dark:text-yellow-200">
        重複配置の警告
      </h3>
      <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
        {duplicates.map((dup) => (
          <li key={dup.horseId}>
            <span className="font-medium">{dup.horseName}</span> が {dup.cells.length}{' '}
            箇所に配置されています:
            <span className="ml-1">{dup.cells.map(formatCellLocation).join('、')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
