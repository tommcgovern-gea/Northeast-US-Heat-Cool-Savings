-- Database schema for Heat-Cool Savings Portal
-- Designed for PostgreSQL (Vercel Postgres)

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  nws_office VARCHAR(10) NOT NULL,
  nws_grid_x INTEGER NOT NULL,
  nws_grid_y INTEGER NOT NULL,
  alert_temp_delta DECIMAL(4,1) NOT NULL DEFAULT 5.0,
  alert_window_hours INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(20),
  preference VARCHAR(10) NOT NULL DEFAULT 'email' CHECK (preference IN ('email', 'sms', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (for admin, staff, building users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'BUILDING')),
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert logs table
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('sudden_fluctuation', 'daily_summary')),
  temperature_data JSONB NOT NULL,
  threshold_used JSONB NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT false
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_log_id UUID REFERENCES alert_logs(id) ON DELETE SET NULL,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('alert', 'daily_summary', 'warning')),
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivery_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo uploads table
CREATE TABLE IF NOT EXISTS photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_compliant BOOLEAN NOT NULL DEFAULT false,
  compliance_window_hours INTEGER NOT NULL DEFAULT 2
);

-- Temperature snapshots (for daily summaries and historical tracking)
CREATE TABLE IF NOT EXISTS temperature_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature_f DECIMAL(5,1) NOT NULL,
  forecast_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_buildings_city_id ON buildings(city_id);
CREATE INDEX IF NOT EXISTS idx_recipients_building_id ON recipients(building_id);
CREATE INDEX IF NOT EXISTS idx_users_building_id ON users(building_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_city_id ON alert_logs(city_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_triggered_at ON alert_logs(triggered_at);
CREATE INDEX IF NOT EXISTS idx_messages_building_id ON messages(building_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_message_id ON photo_uploads(message_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_building_id ON photo_uploads(building_id);
CREATE INDEX IF NOT EXISTS idx_temperature_snapshots_city_id ON temperature_snapshots(city_id);
CREATE INDEX IF NOT EXISTS idx_temperature_snapshots_recorded_at ON temperature_snapshots(recorded_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
