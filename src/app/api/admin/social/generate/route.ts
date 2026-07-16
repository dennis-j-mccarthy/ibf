import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { generateSocialPosts } from '@/lib/social/generate';

export const runtime = 'nodejs';
export const maxDuration = 120; // generating a set of posts can take a while

// Streams NDJSON so the connection stays warm during the long model call — an
// idle POST would otherwise die with a client-side "Failed to fetch". Lines:
//   {"type":"progress"}   (heartbeat as tokens arrive)
//   {"type":"done","posts":[...]}
//   {"type":"error","error":"..."}
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const strategy = typeof body.strategy === 'string' ? body.strategy.trim() : undefined;
  const count = typeof body.count === 'number' ? body.count : undefined;
  const reels = typeof body.reels === 'number' ? body.reels : undefined;
  const books = Array.isArray(body.books)
    ? body.books
        .filter((b: unknown): b is { title: string; url: string } => !!b && typeof (b as { title?: unknown }).title === 'string')
        .map((b: { title: string; url: string }) => ({ title: b.title, url: b.url }))
        .slice(0, 5)
    : undefined;

  if (!content && !strategy) {
    return NextResponse.json({ error: 'Provide blog content or a campaign strategy.' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      // Extra heartbeat every 10s in case the model is quiet (thinking) so the
      // connection never idles long enough to be dropped.
      const beat = setInterval(() => send({ type: 'progress' }), 10000);
      try {
        const posts = await generateSocialPosts(
          { title, content, strategy, count, reels, books },
          { onProgress: () => send({ type: 'progress' }) }
        );
        send({ type: 'done', posts });
      } catch (error) {
        console.error('Social post generation failed:', error);
        send({ type: 'error', error: error instanceof Error ? error.message : 'Generation failed' });
      } finally {
        clearInterval(beat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
