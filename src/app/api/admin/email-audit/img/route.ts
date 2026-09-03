import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Image proxy for the email preview modal, so HubSpot-hosted images render
// without inlining megabytes of data URIs. Strict host allowlist: this must
// not be usable as an open proxy.
const ALLOWED_HOST = /^[a-z0-9-]+\.hubspotusercontent(?:-[a-z0-9]+)?\.net$/i;

export async function GET(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const u = request.nextUrl.searchParams.get('u');
  if (!u) return new NextResponse('Missing u', { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse('Bad URL', { status: 400 });
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
    return new NextResponse('Host not allowed', { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse('Upstream error', { status: 502 });
  }

  const type = upstream.headers.get('content-type') ?? 'application/octet-stream';
  if (!type.startsWith('image/')) {
    return new NextResponse('Not an image', { status: 400 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'content-type': type,
      'cache-control': 'private, max-age=3600',
    },
  });
}
