-- Use only building_ids on users (drop building_id).
-- Run after add-users-columns.sql. Backfills building_ids from building_id then drops building_id.

-- 1. Backfill: set building_ids from building_id where building_ids is empty and building_id is set
UPDATE users
SET building_ids = ARRAY[building_id]::uuid[]
WHERE building_id IS NOT NULL
  AND (building_ids IS NULL OR building_ids = '{}');

-- 2. Drop index and column
DROP INDEX IF EXISTS idx_users_building_id;
ALTER TABLE users DROP COLUMN IF EXISTS building_id;
