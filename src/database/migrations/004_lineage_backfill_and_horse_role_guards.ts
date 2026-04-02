import type { DatabaseConnection } from '../connection';

const MIGRATION_SQL = `
-- 旧データ互換: 親未設定 child を parent に昇格し、更新不能状態を解消
UPDATE lineages
SET lineage_type = 'parent'
WHERE lineage_type = 'child'
  AND parent_lineage_id IS NULL;

-- horses 更新時に既存 breeding_records との整合性を維持
DROP TRIGGER IF EXISTS trg_horses_update_validate;

CREATE TRIGGER IF NOT EXISTS trg_horses_update_validate
BEFORE UPDATE ON horses
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.sex IS NOT NULL AND NEW.sex NOT IN ('牡', '牝', 'セ')
      THEN RAISE(ABORT, 'horses.sex must be one of 牡/牝/セ/NULL')
      WHEN NEW.status IS NULL
      THEN RAISE(ABORT, 'horses.status must not be NULL')
      WHEN NEW.sire_id = NEW.id
      THEN RAISE(ABORT, 'horses: sire_id cannot self reference')
      WHEN NEW.dam_id = NEW.id
      THEN RAISE(ABORT, 'horses: dam_id cannot self reference')
      WHEN NEW.sire_id IS NOT NULL AND NEW.dam_id IS NOT NULL AND NEW.sire_id = NEW.dam_id
      THEN RAISE(ABORT, 'horses: sire_id and dam_id must be different')
      WHEN EXISTS (
        SELECT 1
        FROM breeding_records br
        WHERE br.mare_id = OLD.id
      )
      AND NOT (NEW.status = '繁殖牝馬' OR NEW.sex = '牝')
      THEN RAISE(ABORT, 'horses: referenced mare must remain 繁殖牝馬 or sex=牝')
      WHEN EXISTS (
        SELECT 1
        FROM breeding_records br
        WHERE br.sire_id = OLD.id
      )
      AND NOT (NEW.status = '種牡馬' OR NEW.sex = '牡')
      THEN RAISE(ABORT, 'horses: referenced sire must remain 種牡馬 or sex=牡')
    END;
END;
`;

export async function up(db: DatabaseConnection): Promise<void> {
  await db.exec(MIGRATION_SQL);
}
