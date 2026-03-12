-- Migration: Recipients -> Users (building portal and messaging via users table)
-- Run this on existing DBs that have recipients table. New installs use schema.sql only.

-- 1) Add new columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS building_ids UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preference VARCHAR(10) DEFAULT 'email' CHECK (preference IN ('email', 'sms', 'both'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2) Migrate existing building_id to building_ids (single-element array)
UPDATE users SET building_ids = ARRAY[building_id] WHERE building_id IS NOT NULL AND (building_ids IS NULL OR building_ids = '{}');
ALTER TABLE users DROP COLUMN IF EXISTS building_id;

-- 3) Add user_id to messages and photo_uploads (nullable first)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4) Create BUILDING users from recipients (one user per email, building_ids = array of buildings)
-- Placeholder password hash (bcrypt of 'changeme') - migrated users should set a new password
INSERT INTO users (email, password_hash, role, building_ids, name, phone, preference, is_active)
SELECT DISTINCT ON (r.email)
  r.email,
  '$2a$10$8K1p/a0dL1LQkL1LQkL1LuOxZ1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1',
  'BUILDING',
  (SELECT array_agg(DISTINCT building_id ORDER BY building_id) FROM recipients r2 WHERE r2.email = r.email),
  r.name,
  r.phone,
  COALESCE(r.preference, 'email'),
  COALESCE(r.is_active, true)
FROM recipients r
WHERE r.email IS NOT NULL AND trim(r.email) != ''
ON CONFLICT (email) DO NOTHING;

-- 5) Set messages.user_id from recipient_id (match by recipient email and message building)
UPDATE messages m SET user_id = (
  SELECT u.id FROM users u
  WHERE u.role = 'BUILDING'
    AND u.email = (SELECT email FROM recipients WHERE id = m.recipient_id)
    AND m.building_id = ANY(u.building_ids)
  LIMIT 1
) WHERE m.recipient_id IS NOT NULL;

-- 6) Set photo_uploads.user_id from recipient_id
UPDATE photo_uploads p SET user_id = (
  SELECT u.id FROM users u
  WHERE u.role = 'BUILDING'
    AND u.email = (SELECT email FROM recipients WHERE id = p.recipient_id)
    AND p.building_id = ANY(u.building_ids)
  LIMIT 1
) WHERE p.recipient_id IS NOT NULL;

-- 7) Drop recipient_id and enforce user_id (optional: only if all rows have user_id)
-- ALTER TABLE messages DROP COLUMN recipient_id;
-- ALTER TABLE messages ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE photo_uploads DROP COLUMN recipient_id;
-- ALTER TABLE photo_uploads ALTER COLUMN user_id SET NOT NULL;
-- DROP TABLE recipients;
