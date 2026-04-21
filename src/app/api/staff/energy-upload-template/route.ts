import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAuth } from '@/lib/requireAuth';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "STAFF"]);
    if (auth.error) return auth.error;

    const type = req.nextUrl.searchParams.get('type');
    if (type !== 'utility' && type !== 'degree-days') {
      return NextResponse.json(
        { message: 'type must be utility or degree-days' },
        { status: 400 },
      );
    }

    const wb = XLSX.utils.book_new();
    const header =
      type === 'utility'
        ? [
            'month',
            'year',
            'totalKBTU',
            'electricKWH',
            'gasTherms',
            'fuelOilGallons',
            'districtSteamMBTU',
          ]
        : ['month', 'year', 'hdd', 'cdd'];
    const note =
      type === 'utility'
        ? 'Required: month (1-12), year, totalKBTU. Other columns optional.'
        : 'Required: month (1-12), year, hdd, cdd for the building city.';

    const ws = XLSX.utils.aoa_to_sheet([header, [], [note]]);
    const lastCol = header.length - 1;
    ws['!merges'] = [{ s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } }];
    ws['!cols'] = header.map((name) => ({ wch: Math.max(name.length + 4, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Upload');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const filename =
      type === 'utility'
        ? 'utility-upload-template.xlsx'
        : 'degree-days-upload-template.xlsx';

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('energy-upload-template:', e);
    return NextResponse.json({ message: 'Failed to build template' }, { status: 500 });
  }
}
