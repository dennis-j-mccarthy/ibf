import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// AI helper for the Training page: turns a few rough bullet points into
// on-brand approved statements for an audience.

const SYSTEM = `You are the brand voice of Ignatius Book Fairs (IBF) — a Catholic-friendly book-fair program, "the good alternative to Scholastic," from Ignatius Press + Ave Maria University.

VOICE: warm, informed, encouraging — a trusted librarian, not a marketer. Vibe words: wholesome, curated, timeless, wonder, virtue, good & true, joy, community. Avoid corporate-speak, exclamation stacks, sarcasm, and naming competitors.

You write "approved statements": bold, clever, confident brand STATEMENTS — short and declarative, usually ending in a period ("We start with no.", "Every title earns its place.", "Trust the shelf."). This is the heart of the brand.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    statements: { type: 'array', items: { type: 'string' } },
  },
  required: ['statements'],
} as const;

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const b = await request.json();
    const bullets: string[] = Array.isArray(b.bullets) ? b.bullets.map(String).map((s: string) => s.trim()).filter(Boolean) : [];
    if (!bullets.length) return NextResponse.json({ error: 'Give me at least one bullet point.' }, { status: 400 });

    const audience: string = typeof b.audience === 'string' ? b.audience.trim() : '';
    const persona: string = typeof b.persona === 'string' ? b.persona.trim() : '';
    const painPoints: string[] = Array.isArray(b.painPoints) ? b.painPoints.map(String).filter(Boolean) : [];

    const user = `Craft 5–8 approved brand statements from these rough bullet points:
${bullets.map((x) => `- ${x}`).join('\n')}
${audience ? `\nAudience: ${audience}.` : ''}${persona ? `\nAudience persona: ${persona}.` : ''}${painPoints.length ? `\nSpeak to these pain points where natural: ${painPoints.join(' · ')}.` : ''}

Each statement: short (2–8 words ideal), declarative, clever, on-voice, ends in a period. No emoji, no hashtags, no exclamation marks. Return only the statements.`;

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: user }],
    });
    const final = await stream.finalMessage();
    const text = final.content.find((c) => c.type === 'text');
    const parsed = JSON.parse(text && 'text' in text ? text.text : '{}');
    const statements = (parsed.statements ?? []).map(String).filter(Boolean);

    return NextResponse.json({ statements });
  } catch (e) {
    console.error('craft statements failed:', e);
    return NextResponse.json({ error: 'Generation failed. Try again.' }, { status: 500 });
  }
}
