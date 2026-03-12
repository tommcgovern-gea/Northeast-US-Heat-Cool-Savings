-- Add missing columns to users table (name, phone, preference, is_active, building_ids).
-- Run this once on your existing DB. Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE users ADD COLUMN IF NOT EXISTS building_ids UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS preference VARCHAR(10) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Optional: add constraint for preference (run only if you want to restrict values)
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_preference_check;
-- ALTER TABLE users ADD CONSTRAINT users_preference_check CHECK (preference IN ('email', 'sms', 'both'));

-- Add user_id to messages and photo_uploads (required for daily-summary / user-based messaging).
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE photo_uploads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_user_id ON photo_uploads(user_id);
