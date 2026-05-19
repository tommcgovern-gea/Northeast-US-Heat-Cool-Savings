-- One-time access codes for building portal entry (bcrypt hash + optional plain for ops).
CREATE TABLE IF NOT EXISTS access_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL,
  plain_code VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_access_codes_status ON access_codes (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_codes_plain_code
  ON access_codes (plain_code)
  WHERE plain_code IS NOT NULL;
