import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { generateSocialPosts } from '@/lib/social/generate';
import { getSavedTrainingProfile, brandBrief, getTrainingImages, getTrainingDocuments, photoBackgrounds } from '@/lib/training';

export const runtime = 'nodejs';
export const maxDuration = 120; // generating a set of posts can take a while

// Same-origin motion clips (public/brand/motion) used as real video-reel
// backgrounds. One reel per set is rendered over one of these.
const MOTION_CLIPS = ['/brand/motion/kids-bookfair.mp4'];

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

  // Brand training: brief for the prompt + a photo pool for photo-hero backgrounds.
  const savedProfile = await getSavedTrainingProfile();
  const docs = await getTrainingDocuments();
  const brief = savedProfile ? brandBrief(savedProfile, { docs }) : '';
  const photoPool = photoBackgrounds(await getTrainingImages());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      // Extra heartbeat every 10s in case the model is quiet (thinking) so the
      // connection never idles long enough to be dropped.
      const beat = setInterval(() => send({ type: 'progress' }), 10000);
      try {
        const posts = await generateSocialPosts(
          { title, content, strategy, count, reels, books, brandBrief: brief, photos: photoPool.length },
          { onProgress: () => send({ type: 'progress' }) }
        );
        // Assign real brand photos (round-robin) to photo-hero posts AND to any
        // reel — reels animate into video and always look better over a photo.
        let pi = 0;
        const withPhotos = posts.map((p) =>
          (p.theme === 'photo-hero' || p.format === 'reel') && photoPool.length
            ? { ...p, img: photoPool[pi++ % photoPool.length].url }
            : p,
        );
        // Make ONE reel a real motion-clip reel (video background). Round-robin
        // through the available clips if we add more later.
        let mi = 0;
        const withMotion = MOTION_CLIPS.length
          ? withPhotos.map((p) =>
              p.format === 'reel' && mi === 0 ? ((mi += 1), { ...p, video: MOTION_CLIPS[0] }) : p,
            )
          : withPhotos;
        send({ type: 'done', posts: withMotion });
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
