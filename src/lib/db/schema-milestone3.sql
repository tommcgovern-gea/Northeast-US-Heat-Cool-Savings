-- Additional schema for Milestone 3
-- Run this after the base schema.sql

-- Message templates table (per city)
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

-- Index for message templates
CREATE INDEX IF NOT EXISTS idx_message_templates_city_id ON message_templates(city_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(template_type);

-- Trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
