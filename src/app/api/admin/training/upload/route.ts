import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-side upload to Vercel Blob. The store is connected via OIDC, so put()
// authenticates automatically from BLOB_STORE_ID + the platform's VERCEL_OIDC_TOKEN
// — no static BLOB_READ_WRITE_TOKEN required. The browser downscales images before
// posting so they stay under the serverless request-body limit. Metadata is
// recorded separately via POST /api/admin/training/images with the returned url.
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Blob storage is not configured on this deployment yet. Add images by URL in the meantime.' },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  }
  // mode=document (the Document library) accepts brand docs; default stays image-only.
  const DOC_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
  ]);
  const isDocMode = form?.get('mode') === 'document';
  if (isDocMode) {
    if (!DOC_TYPES.has(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only PDF, Word, PowerPoint, text, or image files are allowed.' }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File is too large (25 MB max).' }, { status: 400 });
    }
  } else if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 });
  }

  try {
    const blob = await put(`training/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
