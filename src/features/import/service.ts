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
  async function writeImportLog(params: {
    gameYear: number;
    recordCount: number;
    newCount: number;
    updatedCount: number;
    status: 'success' | 'failed';
    errorDetail: string | null;
  }): Promise<void> {
    await deps.db.run(
      `INSERT INTO import_logs (game_year, file_name, record_count, new_count, updated_count, status, error_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.gameYear,
        null,
        params.recordCount,
        params.newCount,
        params.updatedCount,
        params.status,
        params.errorDetail,
      ],
    );
  }

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

        // Match by name+birthYear first, then ancestor-only fallback (name + birth_year IS NULL)
        let existing = await deps.horseRepo.findByNameAndBirthYear(parsed.name, parsed.birthYear);
        if (!existing) {
          existing = await deps.horseRepo.findAncestorByName(parsed.name);
        }
        if (!existing) {
          const sameNameHorses = await deps.horseRepo.findByName(parsed.name);
          if (sameNameHorses.length === 1) {
            existing = sameNameHorses[0];
          }
        }

        if (!existing) {
          previewRows.push({ parsed, action: 'create' });
          newCount++;
        } else {
          const changes = detectChanges(existing, parsed, importStatus);
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
        importStatus,
        rows: previewRows,
        summary: { newCount, updateCount, skipCount, invalidCount },
      };
    },

    async execute(preview: ImportPreview): Promise<ImportResult> {
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let currentPhase = 'initialization';

      try {
        await deps.db.transaction(async (tx) => {
          currentPhase = 'repository setup';
          // Create repos bound to the transaction connection
          const { createHorseRepository } = await import('@/features/horses/repository');
          const { createYearlyStatusRepository } =
            await import('@/features/horses/yearly-status-repository');
          const { createLineageRepository } = await import('@/features/lineages/repository');

          const txHorseRepo = createHorseRepository(tx);
          const txYearlyStatusRepo = createYearlyStatusRepository(tx);
          const txLineageRepo = createLineageRepository(tx);

          currentPhase = 'row processing';
          for (let i = 0; i < preview.rows.length; i++) {
            const row = preview.rows[i];
            currentPhase = `row processing (${i + 1}/${preview.rows.length})`;

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
              const p = row.parsed;

              // Build update data, only including non-null parsed values
              // (undefined values are skipped by horseToColumns, preserving existing DB values)
              const updateData: Record<string, unknown> = {};
              if (p.sex !== null) updateData.sex = p.sex;
              if (p.birthYear !== null) updateData.birthYear = p.birthYear;
              if (p.country !== null) updateData.country = p.country;
              updateData.isHistorical = p.isHistorical;
              if (p.mareLineName !== null) updateData.mareLine = p.mareLineName;
              updateData.status = preview.importStatus ?? '現役';

              // D3: only update pedigree when parsed data provides names
              if (p.sireName !== null) {
                const sireId = await resolveAncestor(
                  txHorseRepo,
                  txLineageRepo,
                  p.sireName,
                  p.sireLineageName,
                );
                updateData.sireId = sireId;
              }
              if (p.damName !== null) {
                const damId = await resolveAncestor(txHorseRepo, txLineageRepo, p.damName, null);
                updateData.damId = damId;
              }
              if (p.sireLineageName !== null) {
                const lineageId = await resolveLineage(txLineageRepo, p.sireLineageName);
                updateData.lineageId = lineageId;
              }

              await txHorseRepo.update(horse.id, updateData);

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
        });

        await writeImportLog({
          gameYear: preview.importYear,
          recordCount: preview.rows.length,
          newCount: created,
          updatedCount: updated,
          status: 'success',
          errorDetail: null,
        });
        return {
          success: true,
          created,
          updated,
          skipped,
          errors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorDetail = `phase=${currentPhase}; message=${message}`;

        await writeImportLog({
          gameYear: preview.importYear,
          recordCount: preview.rows.length,
          newCount: created,
          updatedCount: updated,
          status: 'failed',
          errorDetail,
        });

        return {
          success: false,
          created,
          updated,
          skipped,
          errors: [
            {
              row: 0,
              horseName: 'import',
              message: errorDetail,
            },
          ],
        };
      }
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

  // Auto-create lineage as parent type.
  // parentLineageId が不明な状態で child を作ると DB 制約に違反するため。
  const lineage = await lineageRepo.create({
    name: lineageName,
    lineageType: 'parent',
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

function hasAnyD2Data(parsed: ParsedHorseRow): boolean {
  return (
    parsed.spRank !== null ||
    parsed.spValue !== null ||
    parsed.powerRank !== null ||
    parsed.powerValue !== null ||
    parsed.instantRank !== null ||
    parsed.instantValue !== null ||
    parsed.staminaRank !== null ||
    parsed.staminaValue !== null ||
    parsed.mentalRank !== null ||
    parsed.mentalValue !== null ||
    parsed.wisdomRank !== null ||
    parsed.wisdomValue !== null ||
    parsed.turfAptitude !== null ||
    parsed.dirtAptitude !== null ||
    parsed.distanceMin !== null ||
    parsed.distanceMax !== null ||
    parsed.growthType !== null ||
    parsed.runningStyle !== null ||
    parsed.traits !== null ||
    parsed.jockey !== null ||
    parsed.raceRecord !== null
  );
}

function detectChanges(
  existing: {
    sex: string | null;
    birthYear: number | null;
    country: string | null;
    isHistorical: boolean;
    mareLine: string | null;
    status: string;
    sireId: number | null;
    damId: number | null;
    lineageId: number | null;
  },
  parsed: ParsedHorseRow,
  importStatus: ImportStatus,
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  // Ancestor horses always need a full update (they have minimal data)
  if (existing.status === 'ancestor') {
    changes.status = { old: existing.status, new: importStatus };
    return changes;
  }

  // D1 field comparison
  if (parsed.sex !== null && parsed.sex !== existing.sex) {
    changes.sex = { old: existing.sex, new: parsed.sex };
  }
  if (parsed.birthYear !== null && parsed.birthYear !== existing.birthYear) {
    changes.birthYear = { old: existing.birthYear, new: parsed.birthYear };
  }
  if (parsed.country !== null && parsed.country !== existing.country) {
    changes.country = { old: existing.country, new: parsed.country };
  }
  if (parsed.isHistorical !== existing.isHistorical) {
    changes.isHistorical = { old: existing.isHistorical, new: parsed.isHistorical };
  }
  if (parsed.mareLineName !== null && parsed.mareLineName !== existing.mareLine) {
    changes.mareLine = { old: existing.mareLine, new: parsed.mareLineName };
  }
  if (importStatus !== existing.status) {
    changes.status = { old: existing.status, new: importStatus };
  }

  // D3: sire/dam/lineage — preview cannot compare names with IDs,
  // so any non-null pedigree name triggers update (execute will resolve)
  if (parsed.sireName !== null) {
    changes.sire = { old: existing.sireId, new: parsed.sireName };
  }
  if (parsed.damName !== null) {
    changes.dam = { old: existing.damId, new: parsed.damName };
  }
  if (parsed.sireLineageName !== null) {
    changes.lineage = { old: existing.lineageId, new: parsed.sireLineageName };
  }

  // D2: yearly status — any non-null D2 field triggers update
  // (year-specific data cannot be compared without DB query)
  if (hasAnyD2Data(parsed)) {
    changes.yearlyStatus = { old: 'existing', new: 'import data' };
  }

  return changes;
}

function buildYearlyStatusUpdateInput(parsed: ParsedHorseRow): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (parsed.spRank !== null) data.spRank = parsed.spRank;
  if (parsed.spValue !== null) data.spValue = parsed.spValue;
  if (parsed.powerRank !== null) data.powerRank = parsed.powerRank;
  if (parsed.powerValue !== null) data.powerValue = parsed.powerValue;
  if (parsed.instantRank !== null) data.instantRank = parsed.instantRank;
  if (parsed.instantValue !== null) data.instantValue = parsed.instantValue;
  if (parsed.staminaRank !== null) data.staminaRank = parsed.staminaRank;
  if (parsed.staminaValue !== null) data.staminaValue = parsed.staminaValue;
  if (parsed.mentalRank !== null) data.mentalRank = parsed.mentalRank;
  if (parsed.mentalValue !== null) data.mentalValue = parsed.mentalValue;
  if (parsed.wisdomRank !== null) data.wisdomRank = parsed.wisdomRank;
  if (parsed.wisdomValue !== null) data.wisdomValue = parsed.wisdomValue;
  if (parsed.turfAptitude !== null) data.turfAptitude = parsed.turfAptitude;
  if (parsed.dirtAptitude !== null) data.dirtAptitude = parsed.dirtAptitude;
  if (parsed.distanceMin !== null) data.distanceMin = parsed.distanceMin;
  if (parsed.distanceMax !== null) data.distanceMax = parsed.distanceMax;
  if (parsed.growthType !== null) data.growthType = parsed.growthType;
  if (parsed.runningStyle !== null) data.runningStyle = [parsed.runningStyle];
  if (parsed.traits !== null) data.traits = parsed.traits;
  if (parsed.jockey !== null) data.jockey = parsed.jockey;
  if (parsed.raceRecord !== null) data.raceRecord = parsed.raceRecord;
  return data;
}
