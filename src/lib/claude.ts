import Anthropic from '@anthropic-ai/sdk';

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
}): Promise<GeneratedArticle> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const user = `Write a blog post about: ${input.topic}.
${input.category ? `Intended category: ${input.category}.` : ''}

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
  return JSON.parse(textBlock.text) as GeneratedArticle;
}
