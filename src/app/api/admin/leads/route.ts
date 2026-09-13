import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { getStore } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  // Quote everything and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Leads as CSV for importing into a newsletter or CRM tool. Admin only. */
export async function GET(): Promise<Response> {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const leads = await getStore().listLeads(10_000);
  const lines = [
    ['email', 'source', 'scanned_url', 'score', 'locale', 'created_at'].join(','),
    ...leads.map((lead) =>
      [lead.email, lead.source, lead.scannedUrl, lead.score, lead.locale, lead.createdAt].map(csvCell).join(','),
    ),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="citable-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
