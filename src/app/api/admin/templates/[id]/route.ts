import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { templateService } from '@/lib/services/templateService';
import { sql } from '@neondatabase/serverless';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { content, subject, variables, isActive } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }
    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex}`);
      values.push(subject);
      paramIndex++;
    }
    if (variables !== undefined) {
      updates.push(`variables = $${paramIndex}`);
      values.push(JSON.stringify(variables));
      paramIndex++;
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(params.id);
    
    const query = `UPDATE message_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    const template = result.rows[0];

    return NextResponse.json({
      id: template.id,
      cityId: template.city_id,
      templateType: template.template_type,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      isActive: template.is_active,
      updatedAt: template.updated_at,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { message: 'Error updating template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await templateService.deleteTemplate(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { message: 'Error deleting template' },
      { status: 500 }
    );
  }
}
