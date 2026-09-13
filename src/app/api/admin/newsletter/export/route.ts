import { NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

// CSV export of every newsletter signup (staff and admins alike).
export async function GET() {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let rows;
  try {
    rows = await prisma.newsletterSignup.findMany({ orderBy: { createdAt: 'asc' } });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2021') {
      return NextResponse.json({ error: 'Table not pushed yet' }, { status: 503 });
    }
    throw err;
  }
  const lines = ['email,first_name,last_name,source,path,signed_up'];
  for (const r of rows) {
    lines.push(
      [r.email, r.firstName, r.lastName, r.source, r.path, r.createdAt.toISOString()].map(esc).join(',')
    );
  }
  return new NextResponse(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="newsletter-signups-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
