import Anthropic from '@anthropic-ai/sdk';

// Generates on-brand IBF social posts by spinning + angling blog content into the
// design system's layout archetypes. Uses the Anthropic SDK (ANTHROPIC_API_KEY),
// Claude Opus 4.8, adaptive thinking, and structured outputs.

export type SocialPost = {
  theme: 'statement' | 'stat' | 'checklist' | 'steps' | 'quote' | 'photo-hero';
  format: 'square' | 'reel';
  mode: 'catholic' | 'parish' | 'public' | 'virtual';
  eyebrow: string;
  statement: string;
  sub: string;
  statLabel: string;
  items: string[];
  caption: string;
  hashtags: string[];
};

const POST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    posts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          theme: { type: 'string', enum: ['statement', 'stat', 'checklist', 'steps', 'quote', 'photo-hero'] },
          format: { type: 'string', enum: ['square', 'reel'] },
          mode: { type: 'string', enum: ['catholic', 'parish', 'public', 'virtual'] },
          eyebrow: { type: 'string' },
          statement: { type: 'string' },
          sub: { type: 'string' },
          statLabel: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
        },
        required: ['theme', 'format', 'mode', 'eyebrow', 'statement', 'sub', 'statLabel', 'items', 'caption', 'hashtags'],
      },
    },
  },
  required: ['posts'],
} as const;

const SYSTEM = `You are the brand voice of Ignatius Book Fairs (IBF) — a Catholic-friendly book-fair program, "the good alternative to Scholastic," from Ignatius Press + Ave Maria University.

VOICE: warm, informed, encouraging — a trusted librarian, not a marketer. Second person ("you", "your students/parish/kids"); "we" for IBF; never "I". Vibe words: wholesome, curated, timeless, wonder, virtue, good & true, joy, community. Avoid corporate-speak, exclamation stacks, sarcasm, and naming competitors (only "the good alternative to Scholastic", sparingly). No emoji in the on-graphic text.

GRAPHIC COPY: bold, clever, confident STATEMENTS — short and declarative, usually ending in a period ("We start with no.", "Every title earns its place.", "Trust the shelf."). This is the heart of the brand.

You write posts that render into fixed design-system LAYOUT ARCHETYPES. Use the right archetype for the angle:
- "statement": a bold headline statement + one supporting subline. The default; most versatile.
- "stat": a single striking number/figure. Put the number in "statement" (e.g. "1,200+"), a short ALL-CAPS label in "statLabel", and a one-line context in "sub".
- "checklist": a headline "statement" + 3–5 short "items" (each a few words) of what's included.
- "steps": a headline "statement" + 3–4 short ordered "items" describing a process.
- "quote": a real-sounding testimonial in "statement" + attribution in "sub" (e.g. "Jenna M. · mom of 3").
- "photo-hero": a bold, aspirational/emotional statement designed to sit over a full-bleed lifestyle photo of a child reading. Great for the strongest emotional hook of the set. A real brand photo is supplied automatically — you only write the statement (+ optional short "sub"). Include 1–2 of these in a set.

MODE sets the color; pick the one that fits the content: catholic (blue), parish (green), public (coral), virtual (sky).

FORMAT: every post has a "format" — "square" (1:1 feed post) or "reel" (9:16 vertical). Reels are read fast on a vertical scroll, so make them the boldest, shortest, most hook-first statements (fewer words than a square).

For EACH post also write a "caption" (the platform caption — warm, a little longer, can drive to a link) and 1–3 "hashtags" (words only, no # symbol).

Fields you don't use for a given theme: set "sub"/"statLabel" to "" and "items" to [] as appropriate. Keep statements SHORT (fit a poster). Make the set varied across archetypes.`;

export async function generateSocialPosts(
  input: {
    title?: string;
    content?: string; // plain text of the blog post (optional if strategy given)
    strategy?: string; // overarching campaign angle/direction
    count?: number; // square (1:1) posts
    reels?: number; // reel (9:16 vertical) posts
    books?: { title: string; url: string }[]; // featured books to mention
  },
  opts?: { onProgress?: () => void } // called as tokens stream in (keeps the HTTP connection alive)
): Promise<SocialPost[]> {
  const client = new Anthropic();
  const count = Math.min(Math.max(input.count ?? 5, 1), 8);
  const reels = Math.min(Math.max(input.reels ?? 0, 0), 5);
  const total = count + reels;
  const hasContent = !!input.content?.trim();
  const books = input.books ?? [];

  const formatLine = `Of the ${total} posts, make exactly ${reels} "format":"reel" (9:16 vertical — the punchiest, shortest, most hook-first statements) and ${count} "format":"square" (1:1).`;
  const booksLine = books.length
    ? `\nFEATURE THESE BOOKS — weave the titles into captions naturally where they fit (a book-cover graphic is added separately, so don't describe covers):\n${books.map((b) => `- ${b.title}`).join('\n')}\n`
    : '';

  const user = hasContent
    ? `Create ${total} on-brand social posts that spin and angle THIS blog content into bold IBF statements. Vary the archetypes. ${formatLine}
${booksLine}
${input.strategy ? `CAMPAIGN STRATEGY / THEME: ${input.strategy}\n` : ''}BLOG TITLE: ${input.title || ''}

BLOG CONTENT:
${(input.content || '').slice(0, 6000)}

Return ${total} posts as structured JSON. Each must stand on its own as a scroll-stopping, on-brand graphic + caption.`
    : `Create ${total} on-brand social posts for THIS CAMPAIGN (there is no blog — work from the strategic direction alone). Invent concrete, on-brand, specific angles that fit the strategy; vary the archetypes. ${formatLine}
${booksLine}
CAMPAIGN STRATEGY / DIRECTION: ${input.strategy || ''}
${input.title ? `CAMPAIGN NAME: ${input.title}\n` : ''}
Return ${total} posts as structured JSON. Each must stand on its own as a scroll-stopping, on-brand graphic + caption.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 12000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: POST_SCHEMA } },
    messages: [{ role: 'user', content: user }],
  });

  if (opts?.onProgress) stream.on('text', () => opts.onProgress!());

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('The model declined to generate posts.');
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No posts were generated.');
  const parsed = JSON.parse(textBlock.text) as { posts: SocialPost[] };
  return parsed.posts;
}
