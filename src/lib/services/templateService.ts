import { sql, toRows } from '@/lib/db/client';
import { db } from '@/lib/db/client';

export interface MessageTemplate {
  id: string;
  city_id: string;
  template_type: 'alert' | 'daily_summary' | 'warning';
  subject: string | null;
  content: string;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariables {
  temperatureChange?: number;
  timeWindow?: number;
  currentTemp?: number;
  futureTemp?: number;
  averageTemp?: number;
  minTemp?: number;
  maxTemp?: number;
  cityName?: string;
  buildingName?: string;
  uploadUrl?: string;
}

export class TemplateService {
  async getTemplate(cityId: string, templateType: 'alert' | 'daily_summary' | 'warning'): Promise<MessageTemplate | null> {
    try {
      const result = await sql`
        SELECT * FROM message_templates
        WHERE city_id = ${cityId}
          AND template_type = ${templateType}
          AND is_active = true
        LIMIT 1
      `;
      const rows = toRows(result);
      return (rows[0] as MessageTemplate) ?? null;
    } catch {
      return null;
    }
  }

  async getDefaultTemplate(templateType: 'alert' | 'daily_summary' | 'warning'): Promise<string> {
    const defaults = {
      alert: `⚠️ SUDDEN TEMPERATURE ALERT\n\n` +
        `Temperature is expected to change by {{temperatureChange}}°F ` +
        `in the next {{timeWindow}} hours ` +
        `({{currentTemp}}°F → {{futureTemp}}°F).\n\n` +
        `Please adjust heating/cooling settings accordingly.\n\n` +
        `Upload photo or BMS record: {{uploadUrl}}`,
      
      daily_summary: `📊 Daily Temperature Summary\n\n` +
        `Average: {{averageTemp}}°F\n` +
        `High: {{maxTemp}}°F\n` +
        `Low: {{minTemp}}°F\n` +
        `Change from yesterday: {{temperatureChange}}°F\n\n` +
        `Please confirm your settings adjustment.\n\n` +
        `Upload photo or BMS record: {{uploadUrl}}`,
      
      warning: `⚠️ COMPLIANCE WARNING\n\n` +
        `You have not uploaded compliance documentation (photo or BMS record) for the message sent {{hoursAgo}} hours ago.\n\n` +
        `Please upload immediately. Failure to comply may void your guarantee.\n\n` +
        `Upload link: {{uploadUrl}}`,
    };

    return defaults[templateType] || '';
  }

  async renderTemplate(
    template: string,
    variables: TemplateVariables
  ): Promise<string> {
    let rendered = template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value || ''));
    });

    return rendered;
  }

  async createOrUpdateTemplate(
    cityId: string,
    templateType: 'alert' | 'daily_summary' | 'warning',
    content: string,
    subject?: string,
    variables?: any
  ): Promise<MessageTemplate> {
    const existing = await this.getTemplate(cityId, templateType);

    if (existing) {
      const result = await sql`
        UPDATE message_templates
        SET content = ${content},
            subject = ${subject || null},
            variables = ${JSON.stringify(variables || {})}::jsonb,
            updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING *
      `;
      return toRows(result)[0] as MessageTemplate;
    } else {
      const result = await sql`
        INSERT INTO message_templates (
          city_id, template_type, subject, content, variables, is_active
        ) VALUES (
          ${cityId},
          ${templateType},
          ${subject || null},
          ${content},
          ${JSON.stringify(variables || {})}::jsonb,
          true
        )
        RETURNING *
      `;
      return toRows(result)[0] as MessageTemplate;
    }
  }

  async getCityTemplates(cityId: string): Promise<MessageTemplate[]> {
    const result = await sql`
      SELECT * FROM message_templates
      WHERE city_id = ${cityId}
      ORDER BY template_type
    `;

    return toRows(result) as MessageTemplate[];
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await sql`
      UPDATE message_templates
      SET is_active = false
      WHERE id = ${templateId}
    `;
  }
}

export const templateService = new TemplateService();
