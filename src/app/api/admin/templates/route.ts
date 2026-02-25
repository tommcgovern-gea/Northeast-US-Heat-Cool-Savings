import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { templateService } from '@/lib/services/templateService';

export async function GET(req: NextRequest) {
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

    const cityId = req.nextUrl.searchParams.get('cityId');
    if (!cityId) {
      return NextResponse.json({ message: 'cityId is required' }, { status: 400 });
    }

    const templates = await templateService.getCityTemplates(cityId);

    return NextResponse.json({
      cityId,
      templates: templates.map(t => ({
        id: t.id,
        templateType: t.template_type,
        subject: t.subject,
        content: t.content,
        variables: t.variables,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { message: 'Error fetching templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const { cityId, templateType, content, subject, variables } = body;

    if (!cityId || !templateType || !content) {
      return NextResponse.json(
        { message: 'cityId, templateType, and content are required' },
        { status: 400 }
      );
    }

    if (!['alert', 'daily_summary', 'warning'].includes(templateType)) {
      return NextResponse.json(
        { message: 'Invalid templateType' },
        { status: 400 }
      );
    }

    const template = await templateService.createOrUpdateTemplate(
      cityId,
      templateType,
      content,
      subject,
      variables
    );

    return NextResponse.json({
      id: template.id,
      cityId: template.city_id,
      templateType: template.template_type,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating template:', error);
    return NextResponse.json(
      { message: 'Error creating/updating template' },
      { status: 500 }
    );
  }
}
