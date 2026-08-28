// Plain-text knowledge-base feed for the HubSpot chatbot (Breeze Customer Agent
// "Public URL" content source). The /bot-knowledge PAGE renders client-side, so
// its markup isn't reliably crawlable; this route handler returns raw text that
// any crawler can ingest. noindex via X-Robots-Tag.
import { getBotAnswers } from '@/lib/data';
import { answerToText, type BotLink } from '@/lib/bot-knowledge';

export const dynamic = 'force-dynamic';

const AUD_ORDER = ['All', 'In-Person', 'Catholic School', 'Parish', 'Public', 'Virtual'];

export async function GET() {
  const answers = await getBotAnswers();

  const byAud: Record<string, typeof answers> = {};
  for (const a of answers) (byAud[a.audience ?? 'All'] ||= []).push(a);

  const lines: string[] = [
    'Ignatius Book Fairs — Book Fair Help Answers',
    'Common questions about hosting and running an Ignatius Book Fair.',
    '',
  ];

  const buckets = [...AUD_ORDER, ...Object.keys(byAud).filter((a) => !AUD_ORDER.includes(a))];
  for (const aud of buckets) {
    const items = byAud[aud];
    if (!items?.length) continue;
    lines.push(`## Audience: ${aud}`, '');
    for (const a of items) {
      lines.push(`Q: ${a.question}`);
      lines.push(`A: ${answerToText(a.answer)}`);
      const links = Array.isArray(a.links) ? (a.links as unknown as BotLink[]) : [];
      for (const l of links) if (l?.url) lines.push(`Link: ${l.label || l.url} — ${l.url}`);
      lines.push('');
    }
  }

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}
