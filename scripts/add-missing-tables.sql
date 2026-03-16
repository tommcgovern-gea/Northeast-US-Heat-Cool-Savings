-- Add missing tables (message_templates + energy module)
-- Run after base schema.sql. Safe to re-run (uses IF NOT EXISTS).

-- Ensure trigger function exists (in case this is run without full schema)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Message templates (per city)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('alert', 'daily_summary', 'warning')),
  subject VARCHAR(200),
  content TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city_id, template_type)
);
CREATE INDEX IF NOT EXISTS idx_message_templates_city_id ON message_templates(city_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(template_type);
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Utility consumption
CREATE TABLE IF NOT EXISTS utility_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  electric_kwh DECIMAL(10,2),
  gas_therms DECIMAL(10,2),
  fuel_oil_gallons DECIMAL(10,2),
  district_steam_mbtu DECIMAL(10,2),
  total_kbtu DECIMAL(10,2) NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, month, year)
);
CREATE INDEX IF NOT EXISTS idx_utility_consumption_building_id ON utility_consumption(building_id);
CREATE INDEX IF NOT EXISTS idx_utility_consumption_month_year ON utility_consumption(year, month);
DROP TRIGGER IF EXISTS update_utility_consumption_updated_at ON utility_consumption;
CREATE TRIGGER update_utility_consumption_updated_at BEFORE UPDATE ON utility_consumption
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Degree days
CREATE TABLE IF NOT EXISTS degree_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  heating_degree_days DECIMAL(8,1) NOT NULL,
  cooling_degree_days DECIMAL(8,1) NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city_id, month, year)
);
CREATE INDEX IF NOT EXISTS idx_degree_days_city_id ON degree_days(city_id);
CREATE INDEX IF NOT EXISTS idx_degree_days_month_year ON degree_days(year, month);
DROP TRIGGER IF EXISTS update_degree_days_updated_at ON degree_days;
CREATE TRIGGER update_degree_days_updated_at BEFORE UPDATE ON degree_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Energy baselines
CREATE TABLE IF NOT EXISTS energy_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  baseline_type VARCHAR(20) NOT NULL CHECK (baseline_type IN ('heating', 'cooling')),
  avg_consumption_per_degree_day DECIMAL(10,4) NOT NULL,
  baseline_period_start DATE NOT NULL,
  baseline_period_end DATE NOT NULL,
  data_points INTEGER NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, month, baseline_type)
);
CREATE INDEX IF NOT EXISTS idx_energy_baselines_building_id ON energy_baselines(building_id);
CREATE INDEX IF NOT EXISTS idx_energy_baselines_month ON energy_baselines(month);
DROP TRIGGER IF EXISTS update_energy_baselines_updated_at ON energy_baselines;
CREATE TRIGGER update_energy_baselines_updated_at BEFORE UPDATE ON energy_baselines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Energy reports
CREATE TABLE IF NOT EXISTS energy_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  utility_consumption_id UUID REFERENCES utility_consumption(id),
  degree_days_id UUID REFERENCES degree_days(id),
  consumption_per_hdd DECIMAL(10,4),
  consumption_per_cdd DECIMAL(10,4),
  baseline_consumption_per_hdd DECIMAL(10,4),
  baseline_consumption_per_cdd DECIMAL(10,4),
  savings_percentage DECIMAL(5,2),
  savings_kbtu DECIMAL(10,2),
  report_data JSONB NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emailed_to TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_energy_reports_building_id ON energy_reports(building_id);
CREATE INDEX IF NOT EXISTS idx_energy_reports_month_year ON energy_reports(year, month);
