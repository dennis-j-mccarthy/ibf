import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { generateSocialPosts } from '@/lib/social/generate';

export const runtime = 'nodejs';
export const maxDuration = 120; // generating a set of posts can take a while

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

  // Either a blog's content OR a campaign strategy is enough to generate.
  if (!content && !strategy) {
    return NextResponse.json({ error: 'Provide blog content or a campaign strategy.' }, { status: 400 });
  }

  try {
    const posts = await generateSocialPosts({ title, content, strategy, count });
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Social post generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 502 }
    );
  }
}
