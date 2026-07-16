import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { getTrainingProfile, saveTrainingProfile, type TrainingProfileData } from '@/lib/training';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getTrainingProfile());
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : []);

export async function PUT(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  const data: TrainingProfileData = {
    audiences: Array.isArray(b.audiences)
      ? b.audiences
          .filter((a: unknown) => a && typeof (a as { audience?: unknown }).audience === 'string')
          .map((a: { audience: string; statements?: unknown; angles?: unknown }) => ({
            audience: a.audience.trim(),
            statements: asStrings(a.statements),
            angles: asStrings(a.angles),
          }))
          .filter((a: { audience: string }) => a.audience)
      : [],
    colors: Array.isArray(b.colors)
      ? b.colors
          .filter((c: unknown) => c && typeof (c as { hex?: unknown }).hex === 'string')
          .map((c: { name?: string; hex: string }) => ({ name: (c.name ?? '').trim(), hex: c.hex.trim() }))
          .filter((c: { hex: string }) => c.hex)
      : [],
    fonts: Array.isArray(b.fonts)
      ? b.fonts
          .filter((f: unknown) => f && typeof (f as { name?: unknown }).name === 'string')
          .map((f: { name: string; usage?: string }) => ({ name: f.name.trim(), usage: (f.usage ?? '').trim() }))
          .filter((f: { name: string }) => f.name)
      : [],
    socialPrefs: typeof b.socialPrefs === 'string' ? b.socialPrefs : '',
    articlePrefs: typeof b.articlePrefs === 'string' ? b.articlePrefs : '',
  };
  await saveTrainingProfile(data);
  return NextResponse.json({ ok: true });
}
