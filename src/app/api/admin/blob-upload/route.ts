import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Client-upload token handler. The browser uploads large files (tutorial videos)
// straight to Vercel Blob, bypassing the serverless body limit — this route only
// mints a scoped token. Requires a static BLOB_READ_WRITE_TOKEN (client uploads
// can't use OIDC). Metadata is recorded separately after the upload resolves.
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Uploads are not configured: add BLOB_READ_WRITE_TOKEN to this project in Vercel (Storage → ibf-blob → .env.local).' },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: 500 * 1024 * 1024, // 500 MB — screen recordings can be large
        addRandomSuffix: true,
      }),
      // No onUploadCompleted — metadata is recorded client-side after upload, and
      // providing it would require a resolvable webhook callbackUrl.
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 400 });
  }
}
