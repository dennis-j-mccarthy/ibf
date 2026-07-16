import Anthropic from '@anthropic-ai/sdk';
import { featuredBooksHtml } from '@/lib/books';

// AI content generation for the blog admin. Uses the Anthropic SDK (reads
// ANTHROPIC_API_KEY), Claude Opus 4.8, adaptive thinking, and structured
// outputs so the model returns a validated JSON shape rather than loose text.

export type GeneratedArticle = {
  title: string;
  summary: string;
  category: string;
  contentHtml: string;
};

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    category: { type: 'string', enum: ['Catholic', 'Public', 'General'] },
    contentHtml: { type: 'string' },
  },
  required: ['title', 'summary', 'category', 'contentHtml'],
} as const;

const SYSTEM = `You are the content writer for Ignatius Book Fairs (ignatiusbookfairs.com), which runs Catholic and public school book fairs. You write for book-fair coordinators, teachers, and parents. Voice: warm, encouraging, practical, and professional — faith-friendly for Catholic audiences without being preachy. Every post should be genuinely useful and specific to school book fairs.`;

export async function generateArticle(input: {
  topic: string;
  category?: string;
  audience?: string;
  bullets?: string[];
  books?: { title: string; url: string; image: string; sku?: string }[];
}): Promise<GeneratedArticle> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const points = (input.bullets ?? []).map((b) => b.trim()).filter(Boolean);
  const books = input.books ?? [];
  const user = `Write a blog post about: ${input.topic}.
${input.category ? `Intended category: ${input.category}.` : ''}
${input.audience ? `Write primarily for this audience: ${input.audience}. Tailor tone, examples, and takeaways to them.` : ''}
${points.length ? `Make sure the article covers these key points (weave them in naturally as sections):\n${points.map((p) => `- ${p}`).join('\n')}` : ''}
${books.length ? `Feature these specific books — mention each by title naturally in the body (recommend/describe them). A "Featured Books" gallery with covers is appended automatically after your content, so do NOT insert images or a list of covers yourself:\n${books.map((b) => `- ${b.title}`).join('\n')}` : ''}

Return:
- title: a specific, compelling title (no clickbait).
- summary: a 1–2 sentence excerpt.
- category: "Catholic", "Public", or "General".
- contentHtml: the full article body as clean semantic HTML using ONLY these tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. No <html>/<head>/<body>, no inline styles, no <h1> (the title is rendered separately). 500–900 words, skimmable, with a few subheadings.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: ARTICLE_SCHEMA },
    },
    messages: [{ role: 'user', content: user }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error('The model declined to generate this article.');
  }
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No article content was generated.');
  }
  const article = JSON.parse(textBlock.text) as GeneratedArticle;
  // Append the deterministic Featured Books gallery (real covers + shop links).
  if (books.length) article.contentHtml += featuredBooksHtml(books);
  return article;
}

// ---------- Promo kits ----------

export type PromoKit = {
  instagram: { caption: string; hashtags: string[] }[];
  facebook: { post: string }[];
  x: { post: string }[];
  email: { subject: string; preheader: string; bodyHtml: string };
};

const PROMO_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    instagram: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
        },
        required: ['caption', 'hashtags'],
      },
    },
    facebook: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { post: { type: 'string' } },
        required: ['post'],
      },
    },
    x: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { post: { type: 'string' } },
        required: ['post'],
      },
    },
    email: {
      type: 'object',
      additionalProperties: false,
      properties: {
        subject: { type: 'string' },
        preheader: { type: 'string' },
        bodyHtml: { type: 'string' },
      },
      required: ['subject', 'preheader', 'bodyHtml'],
    },
  },
  required: ['instagram', 'facebook', 'x', 'email'],
} as const;

export async function generatePromoKit(input: {
  title: string;
  summary: string;
  category: string;
  articleText: string;
  url: string;
}): Promise<PromoKit> {
  const client = new Anthropic();

  const user = `Create a social-media + email promo kit for this Ignatius Book Fairs blog post. Drive readers to the article and, ultimately, to booking or promoting a school book fair.

TITLE: ${input.title}
CATEGORY: ${input.category}
SUMMARY: ${input.summary}
ARTICLE URL: ${input.url}
ARTICLE TEXT:
${input.articleText.slice(0, 4000)}

Return:
- instagram: 3 variants, each { caption (warm, 1–3 short paragraphs, 1–2 tasteful emoji max), hashtags (5–8 relevant, no # symbol — just the words) }.
- facebook: 2 variants, each { post } — slightly longer, friendly, ends with the article link as plain text.
- x: 3 variants, each { post } — under 280 characters, punchy, include the URL.
- email: { subject (compelling, under 60 chars), preheader (under 100 chars), bodyHtml (2–4 short paragraphs promoting the post as clean HTML using only <p>, <strong>, <em>, <a>; end with a clear call-to-action link to the article) }.`;

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: PROMO_SCHEMA },
    },
    messages: [{ role: 'user', content: user }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error('The model declined to generate promos.');
  }
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No promo content was generated.');
  }
  return JSON.parse(textBlock.text) as PromoKit;
}

// Strip HTML tags to plain text for feeding article content to the model.
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Newsletter compose helpers ----------

const NL_OPTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { options: { type: 'array', items: { type: 'string' } } },
  required: ['options'],
} as const;

const NL_TEXT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { text: { type: 'string' } },
  required: ['text'],
} as const;

export async function suggestNewsletter(input: {
  kind: 'title' | 'subject' | 'preamble';
  timeframe: string;
  articles: { title: string; summary: string; category: string }[];
}): Promise<{ options?: string[]; text?: string }> {
  const client = new Anthropic();
  const list = input.articles
    .map((a, i) => `${i + 1}. ${a.title}${a.summary ? ` — ${a.summary}` : ''}`)
    .join('\n');
  const ctx = `Timeframe: ${input.timeframe || '(unspecified)'}\nArticles featured in this newsletter:\n${list}`;

  let user: string;
  let schema: typeof NL_OPTIONS_SCHEMA | typeof NL_TEXT_SCHEMA;
  if (input.kind === 'title') {
    user = `Suggest 3 short, warm newsletter TITLES (masthead lines, e.g. "Summer Reading Roundup") that fit the timeframe and these articles. Keep each under ~40 characters. Return { options: [3 strings] }.\n\n${ctx}`;
    schema = NL_OPTIONS_SCHEMA;
  } else if (input.kind === 'subject') {
    user = `Suggest 3 compelling EMAIL SUBJECT LINES (each under 60 characters, no clickbait) for this newsletter. Return { options: [3 strings] }.\n\n${ctx}`;
    schema = NL_OPTIONS_SCHEMA;
  } else {
    user = `Write a warm 2–3 sentence PREAMBLE (intro paragraph) for this newsletter that ties the featured articles together and fits the timeframe. Plain text, no salutation like "Dear friends". Return { text }.\n\n${ctx}`;
    schema = NL_TEXT_SCHEMA;
  }

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('The model declined this request.');
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No suggestion was generated.');
  return JSON.parse(textBlock.text) as { options?: string[]; text?: string };
}
