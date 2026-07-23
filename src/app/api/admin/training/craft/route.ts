import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { getTrainingDocuments } from '@/lib/training';

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
    const count: number = Math.min(50, Math.max(3, Number.isFinite(Number(b.count)) && Number(b.count) > 0 ? Math.round(Number(b.count)) : 0)) || 0;
    const audience: string = typeof b.audience === 'string' ? b.audience.trim() : '';
    const persona: string = typeof b.persona === 'string' ? b.persona.trim() : '';
    const painPoints: string[] = Array.isArray(b.painPoints) ? b.painPoints.map(String).filter(Boolean) : [];
    const favorites: string[] = Array.isArray(b.favorites) ? b.favorites.map(String).filter(Boolean).slice(0, 25) : [];

    // Persona always needs bullets; statements/angles can work from just the
    // saved persona + pain points (the click-to-prefill path).
    if (!bullets.length && (kind === 'persona' || (!persona && !painPoints.length))) {
      return NextResponse.json({ error: 'Give me at least one bullet point.' }, { status: 400 });
    }

    // Uploaded brand docs (messaging + design language) steer the craft too.
    const docText = (await getTrainingDocuments())
      .filter((d) => d.text.trim() && (d.kind === 'angles' || d.kind === 'design-language'))
      .map((d) => `--- ${d.title} ---\n${d.text.slice(0, 1500)}`)
      .join('\n')
      .slice(0, 4500);

    const context = `${audience ? `\nAudience: ${audience}.` : ''}${persona ? `\nAudience persona: ${persona}.` : ''}${painPoints.length ? `\nTheir pain points: ${painPoints.join(' · ')}.` : ''}${favorites.length ? `\nThe team starred these as favorites — capture this exact vibe and quality (do not repeat them verbatim): ${favorites.map((f) => `"${f}"`).join(' · ')}.` : ''}${docText ? `\n\nBRAND REFERENCE DOCS (messaging & design language — stay consistent with these):\n${docText}` : ''}`;
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
          ? `Craft ${count ? `exactly ${count}` : '5–7'} marketing ANGLES to pursue in our social posts, ${source}
${context}

An angle is a content DIRECTION — a theme, territory, or storyline to explore in posts (e.g. "Behind the scenes of our curation process", "Why teachers spread the word", "Seasonal faith tie-ins", "Cost vs. big-box fairs"). An angle is NOT a tagline, slogan, or brand statement — punchy declaratives like "Trust the shelf." belong in approved statements, never here. Short phrases (3–8 words, no period), each a genuinely different direction — no near-duplicates; no emoji. Return only the angles.`
          : `Craft ${count ? `exactly ${count}` : '5–8'} approved brand statements & angles — a mix of punchy declaratives (e.g. "We start with no.") and content directions (e.g. "Behind the scenes of our curation") — ${source}
${context}

Each line: short (2–8 words ideal), clever, on-voice. All distinct from each other — no near-duplicates. No emoji, no hashtags, no exclamation marks. Return only the lines as statements.`;

    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
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
