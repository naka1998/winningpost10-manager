import type { DatabaseConnection } from '../connection';

const PATCH_LINEAGE_UPDATE_TRIGGER = `
DROP TRIGGER IF EXISTS trg_lineages_update_validate;

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
`;

export async function up(db: DatabaseConnection): Promise<void> {
  await db.exec(PATCH_LINEAGE_UPDATE_TRIGGER);
}
