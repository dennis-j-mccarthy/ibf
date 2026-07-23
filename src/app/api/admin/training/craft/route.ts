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

const STATEMENTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    statements: { type: 'array', items: { type: 'string' } },
  },
  required: ['statements'],
} as const;

const PERSONA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    persona: { type: 'string' },
    painPoints: { type: 'array', items: { type: 'string' } },
  },
  required: ['persona', 'painPoints'],
} as const;

const ANGLES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    angles: { type: 'array', items: { type: 'string' } },
  },
  required: ['angles'],
} as const;

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const b = await request.json();
    const bullets: string[] = Array.isArray(b.bullets) ? b.bullets.map(String).map((s: string) => s.trim()).filter(Boolean) : [];

    const kind: string = b.kind === 'persona' ? 'persona' : b.kind === 'angles' ? 'angles' : 'statements';
    const audience: string = typeof b.audience === 'string' ? b.audience.trim() : '';
    const persona: string = typeof b.persona === 'string' ? b.persona.trim() : '';
    const painPoints: string[] = Array.isArray(b.painPoints) ? b.painPoints.map(String).filter(Boolean) : [];

    // Persona always needs bullets; statements/angles can work from just the
    // saved persona + pain points (the click-to-prefill path).
    if (!bullets.length && (kind === 'persona' || (!persona && !painPoints.length))) {
      return NextResponse.json({ error: 'Give me at least one bullet point.' }, { status: 400 });
    }

    const context = `${audience ? `\nAudience: ${audience}.` : ''}${persona ? `\nAudience persona: ${persona}.` : ''}${painPoints.length ? `\nTheir pain points: ${painPoints.join(' · ')}.` : ''}`;
    const source = bullets.length
      ? `from these rough bullet points:\n${bullets.map((x) => `- ${x}`).join('\n')}`
      : `grounded in the audience persona and pain points below — speak straight at what they worry about`;

    const user =
      kind === 'persona'
        ? `Define this audience for our marketing from these rough bullet points:
${bullets.map((x) => `- ${x}`).join('\n')}
${audience ? `\nAudience: ${audience}.` : ''}

Return:
- persona: a vivid 2–3 sentence description of who this person is — their world, what they value, how they decide (written plainly, no marketing fluff).
- painPoints: 4–6 concrete pain points (short phrases, one idea each) our book fairs can speak to.`
        : kind === 'angles'
          ? `Craft 5–7 marketing angles to pursue in our social posts, ${source}
${context}

Each angle is a short thematic direction (3–7 words, no period), e.g. "Trust & curation over volume", "Faith-friendly without preachy". Distinct from each other; no emoji. Return only the angles.`
          : `Craft 5–8 approved brand statements ${source}
${context}

Each statement: short (2–8 words ideal), declarative, clever, on-voice, ends in a period. No emoji, no hashtags, no exclamation marks. Return only the statements.`;

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: kind === 'persona' ? PERSONA_SCHEMA : kind === 'angles' ? ANGLES_SCHEMA : STATEMENTS_SCHEMA } },
      messages: [{ role: 'user', content: user }],
    });
    const final = await stream.finalMessage();
    const text = final.content.find((c) => c.type === 'text');
    const parsed = JSON.parse(text && 'text' in text ? text.text : '{}');

    if (kind === 'persona') {
      return NextResponse.json({
        persona: String(parsed.persona ?? ''),
        painPoints: (parsed.painPoints ?? []).map(String).filter(Boolean),
      });
    }
    if (kind === 'angles') {
      return NextResponse.json({ angles: (parsed.angles ?? []).map(String).filter(Boolean) });
    }
    return NextResponse.json({ statements: (parsed.statements ?? []).map(String).filter(Boolean) });
  } catch (e) {
    console.error('craft statements failed:', e);
    return NextResponse.json({ error: 'Generation failed. Try again.' }, { status: 500 });
  }
}
