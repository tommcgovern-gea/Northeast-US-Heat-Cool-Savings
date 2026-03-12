-- Schema variant: users table only for building portal + messaging (no recipients table).
-- Use this for new installs. For existing DBs run scripts/migrate-recipients-to-users.sql first.

-- Users: building_id replaced by building_ids (array) for multi-building access; name, phone, preference for messaging.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS building_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS preference VARCHAR(10) DEFAULT 'email' CHECK (preference IN ('email', 'sms', 'both')),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- If migrating from single building_id: copy to building_ids then drop building_id
-- (Run once) UPDATE users SET building_ids = ARRAY[building_id] WHERE building_id IS NOT NULL AND (building_ids IS NULL OR building_ids = '{}');
-- (Run once) ALTER TABLE users DROP COLUMN IF EXISTS building_id;

-- Messages: user_id instead of recipient_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
-- (After backfill) ALTER TABLE messages DROP COLUMN IF EXISTS recipient_id;

-- Photo uploads: user_id instead of recipient_id
ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
-- (After backfill) ALTER TABLE photo_uploads DROP COLUMN IF EXISTS recipient_id;
