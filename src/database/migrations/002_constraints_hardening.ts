import type { DatabaseConnection } from '../connection';

const HARDENING_SQL = `
-- horses.status の NULL は許容しない（既存 NULL は ancestor に正規化）
UPDATE horses
SET status = 'ancestor'
WHERE status IS NULL;

-- 旧データ互換: 親未設定 child を parent に昇格し、更新不能状態を解消
UPDATE lineages
SET lineage_type = 'parent'
WHERE lineage_type = 'child'
  AND parent_lineage_id IS NULL;

-- 既存重複を解消（同一 mare/year は最新 id を残す）
DELETE FROM breeding_records
WHERE id IN (
  SELECT br.id
  FROM breeding_records br
  JOIN (
    SELECT mare_id, year, MAX(id) AS keep_id, COUNT(*) AS cnt
    FROM breeding_records
    GROUP BY mare_id, year
    HAVING cnt > 1
  ) dup ON dup.mare_id = br.mare_id AND dup.year = br.year
  WHERE br.id <> dup.keep_id
);

-- breeding_records の同一 mare/year 重複を禁止
CREATE UNIQUE INDEX IF NOT EXISTS idx_breeding_records_mare_year_unique
  ON breeding_records(mare_id, year);

-- lineages: parent/child 整合性
CREATE TRIGGER IF NOT EXISTS trg_lineages_insert_validate
BEFORE INSERT ON lineages
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.lineage_type = 'parent' AND NEW.parent_lineage_id IS NOT NULL
      THEN RAISE(ABORT, 'lineages(parent): parent_lineage_id must be NULL')
      WHEN NEW.lineage_type = 'child' AND NEW.parent_lineage_id IS NULL
      THEN RAISE(ABORT, 'lineages(child): parent_lineage_id is required')
      WHEN NEW.parent_lineage_id = NEW.id
      THEN RAISE(ABORT, 'lineages: self reference is not allowed')
      WHEN NEW.lineage_type = 'child' AND NOT EXISTS (
        SELECT 1
        FROM lineages p
        WHERE p.id = NEW.parent_lineage_id
          AND p.lineage_type = 'parent'
      )
      THEN RAISE(ABORT, 'lineages(child): parent must have lineage_type=parent')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_lineages_update_validate
BEFORE UPDATE ON lineages
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.lineage_type = 'parent' AND NEW.parent_lineage_id IS NOT NULL
      THEN RAISE(ABORT, 'lineages(parent): parent_lineage_id must be NULL')
      WHEN NEW.lineage_type = 'child' AND NEW.parent_lineage_id IS NULL
      THEN RAISE(ABORT, 'lineages(child): parent_lineage_id is required')
      WHEN NEW.parent_lineage_id = NEW.id
      THEN RAISE(ABORT, 'lineages: self reference is not allowed')
      WHEN OLD.lineage_type = 'parent' AND NEW.lineage_type = 'child' AND EXISTS (
        SELECT 1
        FROM lineages c
        WHERE c.parent_lineage_id = OLD.id
      )
      THEN RAISE(ABORT, 'lineages: cannot demote parent with existing children')
      WHEN NEW.lineage_type = 'child' AND NOT EXISTS (
        SELECT 1
        FROM lineages p
        WHERE p.id = NEW.parent_lineage_id
          AND p.lineage_type = 'parent'
      )
      THEN RAISE(ABORT, 'lineages(child): parent must have lineage_type=parent')
    END;
END;

-- horses: 性別/自己参照/役割整合
CREATE TRIGGER IF NOT EXISTS trg_horses_insert_validate
BEFORE INSERT ON horses
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
    END;
END;

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

-- breeding_records: 重複/自己参照/役割整合
CREATE TRIGGER IF NOT EXISTS trg_breeding_records_insert_validate
BEFORE INSERT ON breeding_records
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.mare_id = NEW.sire_id
      THEN RAISE(ABORT, 'breeding_records: mare_id and sire_id must be different')
      WHEN NOT EXISTS (
        SELECT 1
        FROM horses m
        WHERE m.id = NEW.mare_id
          AND (m.status = '繁殖牝馬' OR m.sex = '牝')
      )
      THEN RAISE(ABORT, 'breeding_records: mare_id must reference 繁殖牝馬 or sex=牝')
      WHEN NOT EXISTS (
        SELECT 1
        FROM horses s
        WHERE s.id = NEW.sire_id
          AND (s.status = '種牡馬' OR s.sex = '牡')
      )
      THEN RAISE(ABORT, 'breeding_records: sire_id must reference 種牡馬 or sex=牡')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_breeding_records_update_validate
BEFORE UPDATE ON breeding_records
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW.mare_id = NEW.sire_id
      THEN RAISE(ABORT, 'breeding_records: mare_id and sire_id must be different')
      WHEN NOT EXISTS (
        SELECT 1
        FROM horses m
        WHERE m.id = NEW.mare_id
          AND (m.status = '繁殖牝馬' OR m.sex = '牝')
      )
      THEN RAISE(ABORT, 'breeding_records: mare_id must reference 繁殖牝馬 or sex=牝')
      WHEN NOT EXISTS (
        SELECT 1
        FROM horses s
        WHERE s.id = NEW.sire_id
          AND (s.status = '種牡馬' OR s.sex = '牡')
      )
      THEN RAISE(ABORT, 'breeding_records: sire_id must reference 種牡馬 or sex=牡')
    END;
END;

-- updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS trg_lineages_updated_at
AFTER UPDATE ON lineages
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE lineages
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_horses_updated_at
AFTER UPDATE ON horses
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE horses
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_breeding_records_updated_at
AFTER UPDATE ON breeding_records
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE breeding_records
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;
`;

export async function up(db: DatabaseConnection): Promise<void> {
  await db.exec(HARDENING_SQL);
}
