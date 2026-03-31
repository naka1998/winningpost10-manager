import type { HorseRepository } from '@/features/horses/repository';
import type { LineageRepository } from '@/features/lineages/repository';
import type { ImportPreview, ImportPreviewRow, ImportResult, ParsedHorseRow } from './types';

export interface ImportService {
  preview(rows: ParsedHorseRow[], importYear: number): Promise<ImportPreview>;
  execute(preview: ImportPreview): Promise<ImportResult>;
}

export function createImportService(deps: {
  horseRepo: HorseRepository;
  lineageRepo: LineageRepository;
}): ImportService {
  return {
    async preview(rows: ParsedHorseRow[], importYear: number): Promise<ImportPreview> {
      const previewRows: ImportPreviewRow[] = [];
      let newCount = 0;
      let updateCount = 0;
      let skipCount = 0;
      let invalidCount = 0;

      for (const parsed of rows) {
        if (parsed.birthYear === null) {
          previewRows.push({
            parsed,
            action: 'invalid',
            skipReason: '生年（birthYear）が取得できません',
          });
          invalidCount++;
          continue;
        }

        const existing = await deps.horseRepo.findByNameAndBirthYear(
          parsed.name,
          parsed.birthYear,
        );

        if (!existing) {
          previewRows.push({ parsed, action: 'create' });
          newCount++;
        } else {
          const changes = detectChanges(existing, parsed);
          if (Object.keys(changes).length === 0) {
            previewRows.push({ parsed, action: 'skip', existingHorse: existing });
            skipCount++;
          } else {
            previewRows.push({ parsed, action: 'update', existingHorse: existing, changes });
            updateCount++;
          }
        }
      }

      return {
        importYear,
        rows: previewRows,
        summary: { newCount, updateCount, skipCount, invalidCount },
      };
    },

    async execute(_preview: ImportPreview): Promise<ImportResult> {
      // TODO: Implement transaction-based execution
      // This is a skeleton — the full implementation will:
      // 1. BEGIN TRANSACTION
      // 2. For each 'create' row: auto-create sire/dam as ancestors, auto-create lineage, INSERT horse + yearly_status
      // 3. For each 'update' row: UPDATE horse, UPSERT yearly_status
      // 4. INSERT import_log
      // 5. COMMIT (or ROLLBACK on error)
      return {
        success: false,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, horseName: '', message: 'Not implemented' }],
      };
    },
  };
}

function detectChanges(
  existing: { sex: string | null; country: string | null; mareLine: string | null },
  parsed: ParsedHorseRow,
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  if (parsed.sex !== null && parsed.sex !== existing.sex) {
    changes.sex = { old: existing.sex, new: parsed.sex };
  }
  if (parsed.country !== null && parsed.country !== existing.country) {
    changes.country = { old: existing.country, new: parsed.country };
  }
  if (parsed.mareLineName !== null && parsed.mareLineName !== existing.mareLine) {
    changes.mareLine = { old: existing.mareLine, new: parsed.mareLineName };
  }

  return changes;
}
