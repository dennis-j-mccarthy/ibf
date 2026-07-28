import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { fetchBooks } from '@/lib/books';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Resolve BigCommerce shop URLs to {title, image, url} for admin tools
// (Sign Maker poster covers, etc.).
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const urls: string[] = Array.isArray(b?.urls) ? b.urls.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 6) : [];
  if (!urls.length) return NextResponse.json({ error: 'Provide at least one URL.' }, { status: 400 });
  const books = await fetchBooks(urls);
  return NextResponse.json({ books });
}
