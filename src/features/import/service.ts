import type { DatabaseConnection } from '@/database/connection';
import type { HorseRepository } from '@/features/horses/repository';
import type { YearlyStatusRepository } from '@/features/horses/yearly-status-repository';
import type { LineageRepository } from '@/features/lineages/repository';
import type { ImportPreview, ImportPreviewRow, ImportResult, ParsedHorseRow } from './types';

export type ImportStatus = '現役' | '種牡馬' | '繁殖牝馬';

export interface ImportService {
  preview(
    rows: ParsedHorseRow[],
    importYear: number,
    importStatus: ImportStatus,
  ): Promise<ImportPreview>;
  execute(preview: ImportPreview): Promise<ImportResult>;
}

export interface ImportServiceDeps {
  db: DatabaseConnection;
  horseRepo: HorseRepository;
  yearlyStatusRepo: YearlyStatusRepository;
  lineageRepo: LineageRepository;
}

export function createImportService(deps: ImportServiceDeps): ImportService {
  return {
    async preview(
      rows: ParsedHorseRow[],
      importYear: number,
      importStatus: ImportStatus = '現役',
    ): Promise<ImportPreview> {
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

        // Match by name+birthYear first, then by name only (catches ancestors and previously imported horses)
        let existing = await deps.horseRepo.findByNameAndBirthYear(parsed.name, parsed.birthYear);
        if (!existing) {
          existing = await deps.horseRepo.findByName(parsed.name);
        }

        if (!existing) {
          previewRows.push({ parsed, action: 'create' });
          newCount++;
        } else {
          // Always treat existing match as "update" (overwrite)
          previewRows.push({ parsed, action: 'update', existingHorse: existing });
          updateCount++;
        }
      }

      return {
        importYear,
        importStatus,
        rows: previewRows,
        summary: { newCount, updateCount, skipCount, invalidCount },
      };
    },

    async execute(preview: ImportPreview): Promise<ImportResult> {
      return deps.db.transaction(async (tx) => {
        // Create repos bound to the transaction connection
        const { createHorseRepository } = await import('@/features/horses/repository');
        const { createYearlyStatusRepository } =
          await import('@/features/horses/yearly-status-repository');
        const { createLineageRepository } = await import('@/features/lineages/repository');

        const txHorseRepo = createHorseRepository(tx);
        const txYearlyStatusRepo = createYearlyStatusRepository(tx);
        const txLineageRepo = createLineageRepository(tx);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (let i = 0; i < preview.rows.length; i++) {
          const row = preview.rows[i];

          if (row.action === 'skip' || row.action === 'invalid') {
            skipped++;
            continue;
          }

          if (row.action === 'create') {
            // Resolve sire
            const sireId = await resolveAncestor(
              txHorseRepo,
              txLineageRepo,
              row.parsed.sireName,
              row.parsed.sireLineageName,
            );

            // Resolve dam
            const damId = await resolveAncestor(
              txHorseRepo,
              txLineageRepo,
              row.parsed.damName,
              null,
            );

            // Resolve lineage
            const lineageId = await resolveLineage(txLineageRepo, row.parsed.sireLineageName);

            // Create horse
            const horse = await txHorseRepo.create({
              name: row.parsed.name,
              sex: row.parsed.sex,
              birthYear: row.parsed.birthYear,
              country: row.parsed.country,
              isHistorical: row.parsed.isHistorical,
              mareLine: row.parsed.mareLineName,
              status: preview.importStatus ?? '現役',
              sireId,
              damId,
              lineageId,
            });

            // Create yearly status
            await txYearlyStatusRepo.create(
              buildYearlyStatusInput(horse.id, preview.importYear, row.parsed),
            );

            created++;
          } else if (row.action === 'update' && row.existingHorse) {
            const horse = row.existingHorse;

            // Resolve sire/dam for update (fills in missing pedigree)
            const sireId = await resolveAncestor(
              txHorseRepo,
              txLineageRepo,
              row.parsed.sireName,
              row.parsed.sireLineageName,
            );
            const damId = await resolveAncestor(
              txHorseRepo,
              txLineageRepo,
              row.parsed.damName,
              null,
            );
            const lineageId = await resolveLineage(txLineageRepo, row.parsed.sireLineageName);

            // Overwrite horse data
            await txHorseRepo.update(horse.id, {
              sex: row.parsed.sex,
              birthYear: row.parsed.birthYear,
              country: row.parsed.country,
              isHistorical: row.parsed.isHistorical,
              mareLine: row.parsed.mareLineName,
              status: preview.importStatus ?? '現役',
              sireId,
              damId,
              lineageId,
            });

            // Upsert yearly status
            const existingStatus = await txYearlyStatusRepo.findByHorseAndYear(
              horse.id,
              preview.importYear,
            );
            if (existingStatus) {
              await txYearlyStatusRepo.update(
                existingStatus.id,
                buildYearlyStatusUpdateInput(row.parsed),
              );
            } else {
              await txYearlyStatusRepo.create(
                buildYearlyStatusInput(horse.id, preview.importYear, row.parsed),
              );
            }

            updated++;
          }
        }

        // Record import log
        await tx.run(
          `INSERT INTO import_logs (game_year, file_name, record_count, new_count, updated_count, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [preview.importYear, null, preview.rows.length, created, updated, 'success'],
        );

        return {
          success: true,
          created,
          updated,
          skipped,
          errors: [],
        };
      });
    },
  };
}

async function resolveAncestor(
  horseRepo: HorseRepository,
  lineageRepo: LineageRepository,
  ancestorName: string | null,
  lineageName: string | null,
): Promise<number | null> {
  if (!ancestorName) return null;

  const existing = await horseRepo.findAncestorByName(ancestorName);
  if (existing) return existing.id;

  // Auto-create ancestor horse
  const lineageId = await resolveLineage(lineageRepo, lineageName);
  const ancestor = await horseRepo.create({
    name: ancestorName,
    status: 'ancestor',
    lineageId,
  });
  return ancestor.id;
}

async function resolveLineage(
  lineageRepo: LineageRepository,
  lineageName: string | null,
): Promise<number | null> {
  if (!lineageName) return null;

  const existing = await lineageRepo.findByName(lineageName);
  if (existing) return existing.id;

  // Auto-create lineage as child type
  const lineage = await lineageRepo.create({
    name: lineageName,
    lineageType: 'child',
  });
  return lineage.id;
}

function buildYearlyStatusInput(
  horseId: number,
  year: number,
  parsed: ParsedHorseRow,
): {
  horseId: number;
  year: number;
  spRank: string | null;
  spValue: number | null;
  powerRank: string | null;
  powerValue: number | null;
  instantRank: string | null;
  instantValue: number | null;
  staminaRank: string | null;
  staminaValue: number | null;
  mentalRank: string | null;
  mentalValue: number | null;
  wisdomRank: string | null;
  wisdomValue: number | null;
  turfAptitude: string | null;
  dirtAptitude: string | null;
  distanceMin: number | null;
  distanceMax: number | null;
  growthType: string | null;
  runningStyle: string[] | null;
  traits: string[] | null;
  jockey: string | null;
  raceRecord: string | null;
} {
  return {
    horseId,
    year,
    spRank: parsed.spRank,
    spValue: parsed.spValue,
    powerRank: parsed.powerRank,
    powerValue: parsed.powerValue,
    instantRank: parsed.instantRank,
    instantValue: parsed.instantValue,
    staminaRank: parsed.staminaRank,
    staminaValue: parsed.staminaValue,
    mentalRank: parsed.mentalRank,
    mentalValue: parsed.mentalValue,
    wisdomRank: parsed.wisdomRank,
    wisdomValue: parsed.wisdomValue,
    turfAptitude: parsed.turfAptitude,
    dirtAptitude: parsed.dirtAptitude,
    distanceMin: parsed.distanceMin,
    distanceMax: parsed.distanceMax,
    growthType: parsed.growthType,
    runningStyle: parsed.runningStyle ? [parsed.runningStyle] : null,
    traits: parsed.traits,
    jockey: parsed.jockey,
    raceRecord: parsed.raceRecord,
  };
}

function buildYearlyStatusUpdateInput(parsed: ParsedHorseRow) {
  return {
    spRank: parsed.spRank,
    spValue: parsed.spValue,
    powerRank: parsed.powerRank,
    powerValue: parsed.powerValue,
    instantRank: parsed.instantRank,
    instantValue: parsed.instantValue,
    staminaRank: parsed.staminaRank,
    staminaValue: parsed.staminaValue,
    mentalRank: parsed.mentalRank,
    mentalValue: parsed.mentalValue,
    wisdomRank: parsed.wisdomRank,
    wisdomValue: parsed.wisdomValue,
    turfAptitude: parsed.turfAptitude,
    dirtAptitude: parsed.dirtAptitude,
    distanceMin: parsed.distanceMin,
    distanceMax: parsed.distanceMax,
    growthType: parsed.growthType,
    runningStyle: parsed.runningStyle ? [parsed.runningStyle] : null,
    traits: parsed.traits,
    jockey: parsed.jockey,
    raceRecord: parsed.raceRecord,
  };
}
