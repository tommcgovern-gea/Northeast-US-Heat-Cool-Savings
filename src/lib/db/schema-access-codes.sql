-- One-time access codes for building portal entry (bcrypt hash in code column).
CREATE TABLE IF NOT EXISTS access_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes (status);