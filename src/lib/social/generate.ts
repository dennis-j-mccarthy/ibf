import Anthropic from '@anthropic-ai/sdk';

// Generates on-brand IBF social posts by spinning + angling blog content into the
// design system's layout archetypes. Uses the Anthropic SDK (ANTHROPIC_API_KEY),
// Claude Opus 4.8, adaptive thinking, and structured outputs.

export type SocialPost = {
  theme: 'statement' | 'stat' | 'checklist' | 'steps' | 'quote' | 'photo-hero' | 'book-grid' | 'book-carousel';
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
          theme: { type: 'string', enum: ['statement', 'stat', 'checklist', 'steps', 'quote', 'photo-hero', 'book-grid', 'book-carousel'] },
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
- "book-carousel": a swipeable, vertical (9:16) carousel of the featured books — slide 1 is a bold hook "statement" (+ optional "sub"), then one slide per book. Write "items" as one short, selling line per book IN THE SAME ORDER as the featured books list (one item per book, 4-12 words each; the real covers are added automatically). "caption" weaves the titles in naturally. Only usable when featured books are provided; always "format":"reel".
- "book-grid": showcases the featured book covers in a grid. Write a bold, clever "statement" that sells these specific titles (e.g. "Books worth their shelf.", "Start here.") and a "caption" that weaves the book titles in naturally. The real covers are added automatically, so DON'T describe them; leave "items" [], "statLabel" "", "sub" optional. Only usable when featured books are provided; always "format":"square".

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
    photos?: number; // count of brand photos available for photo-hero backgrounds
    brandBrief?: string; // compiled Training profile injected into the system prompt
  },
  opts?: { onProgress?: () => void } // called as tokens stream in (keeps the HTTP connection alive)
): Promise<SocialPost[]> {
  const client = new Anthropic();
  const count = Math.min(Math.max(input.count ?? 5, 1), 8);
  const reels = Math.min(Math.max(input.reels ?? 0, 0), 5);
  const total = count + reels;
  const hasContent = !!input.content?.trim();
  const books = input.books ?? [];

  // When books are featured, ~half the set should actually be book posts —
  // and when there are 2+ books, one of those is a swipeable book carousel.
  const bookPosts = books.length ? Math.min(Math.round(total / 2), count) : 0;
  const carouselPosts = books.length >= 2 && bookPosts > 0 ? 1 : 0;
  const gridPosts = bookPosts - carouselPosts;
  const squareOther = count - bookPosts;

  const formatLine = bookPosts
    ? `Of the ${total} posts: ${carouselPosts ? `exactly ${carouselPosts} must be "theme":"book-carousel" with "format":"reel" (one "items" line per featured book, in order), and ` : ''}exactly ${gridPosts} must be "theme":"book-grid" with "format":"square" (these showcase the featured books). Of the rest, exactly ${reels} must be "format":"reel" (9:16 vertical — punchiest, shortest, most hook-first statements) and ${squareOther} "format":"square" (1:1) using the OTHER archetypes. Book-grid posts are never reels.`
    : `Of the ${total} posts, make exactly ${reels} "format":"reel" (9:16 vertical — the punchiest, shortest, most hook-first statements) and ${count} "format":"square" (1:1).`;
  const booksLine = books.length
    ? `\nFEATURED BOOKS — build the ${bookPosts} "book-grid" post(s) around these titles (covers are added automatically, so don't describe them), and also weave the titles into other captions naturally where they fit:\n${books.map((b) => `- ${b.title}`).join('\n')}\n`
    : '';

  // When the brand photo library has images, actively build photo-hero posts from
  // them (real photos are attached automatically after generation). Aim for about
  // half of the non-book posts, capped by how many distinct photos exist.
  const nonBook = total - bookPosts;
  const photoAvail = Math.max(0, input.photos ?? 0);
  const photoPosts = photoAvail > 0 ? Math.min(nonBook, photoAvail, Math.max(1, Math.round(nonBook / 2))) : 0;
  const photoLine = photoPosts
    ? `\nBRAND PHOTOS AVAILABLE — make exactly ${photoPosts} of the non-book posts "theme":"photo-hero" (a real brand photo is attached automatically to each; write only the bold statement + optional short "sub", never describe the photo). Spread them across reels and squares.\n`
    : '';

  const user = hasContent
    ? `Create ${total} on-brand social posts that spin and angle THIS blog content into bold IBF statements. Vary the archetypes. ${formatLine}
${booksLine}${photoLine}
${input.strategy ? `CAMPAIGN STRATEGY / THEME: ${input.strategy}\n` : ''}BLOG TITLE: ${input.title || ''}

BLOG CONTENT:
${(input.content || '').slice(0, 6000)}

Return ${total} posts as structured JSON. Each must stand on its own as a scroll-stopping, on-brand graphic + caption.`
    : `Create ${total} on-brand social posts for THIS CAMPAIGN (there is no blog — work from the strategic direction alone). Invent concrete, on-brand, specific angles that fit the strategy; vary the archetypes. ${formatLine}
${booksLine}${photoLine}
CAMPAIGN STRATEGY / DIRECTION: ${input.strategy || ''}
${input.title ? `CAMPAIGN NAME: ${input.title}\n` : ''}
Return ${total} posts as structured JSON. Each must stand on its own as a scroll-stopping, on-brand graphic + caption.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 12000,
    thinking: { type: 'adaptive' },
    system: SYSTEM + (input.brandBrief ?? ''),
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
