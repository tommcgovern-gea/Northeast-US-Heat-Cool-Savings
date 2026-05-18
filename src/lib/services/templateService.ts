import { sql, toRows } from '@/lib/db/client';
import {
  CLIENT_DEFAULT_TEMPLATES,
  type AnyTemplateType,
  type MessageTemplateType,
  type TemplateVariables,
} from '@/lib/message-template-defaults';

export {
  MESSAGE_TEMPLATE_TYPES,
  CLIENT_DEFAULT_TEMPLATES,
  LEGACY_TEMPLATE_TYPES,
  isMessageTemplateType,
  resolveTemplateType,
  messageTypeForAlert,
  emailSubjectForTemplate,
} from '@/lib/message-template-defaults';

export type {
  MessageTemplateType,
  AnyTemplateType,
  TemplateVariables,
} from '@/lib/message-template-defaults';

export interface MessageTemplate {
  id: string;
  city_id: string;
  template_type: AnyTemplateType;
  subject: string | null;
  content: string;
  variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class TemplateService {
  async getTemplateByCityAndType(
    cityId: string,
    templateType: AnyTemplateType,
  ): Promise<MessageTemplate | null> {
    const result = await sql`
      SELECT * FROM message_templates
      WHERE city_id = ${cityId}
        AND template_type = ${templateType}
      LIMIT 1
    `;
    const rows = toRows(result);
    return (rows[0] as MessageTemplate) ?? null;
  }

  async getTemplate(cityId: string, templateType: MessageTemplateType): Promise<MessageTemplate | null> {
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

  async resolveTemplateContent(
    cityId: string,
    templateType: MessageTemplateType,
  ): Promise<string> {
    const custom = await this.getTemplate(cityId, templateType);
    if (custom?.content) {
      return custom.content;
    }

    if (templateType.startsWith('alert_')) {
      const legacy = await this.getTemplateByCityAndType(cityId, 'alert');
      if (legacy?.content) return legacy.content;
    }
    if (templateType.startsWith('daily_summary_')) {
      const legacy = await this.getTemplateByCityAndType(cityId, 'daily_summary');
      if (legacy?.content) return legacy.content;
    }

    return this.getDefaultTemplate(templateType);
  }

  async getDefaultTemplate(templateType: MessageTemplateType): Promise<string> {
    return CLIENT_DEFAULT_TEMPLATES[templateType] ?? '';
  }

  async renderTemplate(
    template: string,
    variables: TemplateVariables,
  ): Promise<string> {
    let rendered = template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
    });

    return rendered;
  }

  async createOrUpdateTemplate(
    cityId: string,
    templateType: AnyTemplateType,
    content: string,
    subject?: string,
    variables?: any,
  ): Promise<MessageTemplate> {
    const existing = await this.getTemplateByCityAndType(cityId, templateType);

    if (existing) {
      const result = await sql`
        UPDATE message_templates
        SET content = ${content},
            subject = ${subject || null},
            variables = ${JSON.stringify(variables || {})}::jsonb,
            is_active = true,
            updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING *
      `;
      return toRows(result)[0] as MessageTemplate;
    }
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

  async getCityTemplates(cityId: string): Promise<MessageTemplate[]> {
    const result = await sql`
      SELECT * FROM message_templates
      WHERE city_id = ${cityId}
        AND is_active = true
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
