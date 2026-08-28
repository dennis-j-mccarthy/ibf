// Plain-text knowledge-base feed for the HubSpot chatbot (Breeze Customer Agent
// "Public URL" content source). The /bot-knowledge PAGE renders client-side, so
// its markup isn't reliably crawlable; this route handler returns raw text that
// any crawler can ingest. noindex via X-Robots-Tag.
//
// Every answer carries the same tags the website uses, because the knowledge
// base holds Catholic and Public versions of the same question with genuinely
// different wording ("schools" vs "schools and parishes"). Without the "Applies
// to" line the bot has two contradictory answers and no way to choose, so it
// could hand a public school the parish answer.
import { getBotAnswers } from '@/lib/data';
import { answerToText, parseDocs, FAQ_DOCUMENTS, SITE_URL, type BotLink } from '@/lib/bot-knowledge';

export const dynamic = 'force-dynamic';

const AUD_ORDER = ['All', 'In-Person', 'Catholic School', 'Parish', 'Public', 'Virtual'];

const APPLIES_TO: Record<string, string> = {
  Catholic: 'Catholic schools and parishes only',
  Public: 'Public and charter schools only',
  Both: 'All organizations',
};

export async function GET() {
  const answers = await getBotAnswers();

  const byAud: Record<string, typeof answers> = {};
  for (const a of answers) (byAud[a.audience ?? 'All'] ||= []).push(a);

  const lines: string[] = [
    'Ignatius Book Fairs — Book Fair Help Answers',
    'Common questions about hosting and running an Ignatius Book Fair.',
    '',
    'HOW TO USE THIS PAGE',
    'Some questions appear more than once with different answers, because the',
    'answer genuinely differs by organization type or by fair format. Use the',
    '"Applies to" line to pick the right one: never give a Catholic-only answer',
    'to a public or charter school, or an in-person answer for a virtual fair.',
    'When an answer names a source document, link the reader to that PDF.',
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

      if (a.siteVersion && APPLIES_TO[a.siteVersion]) {
        lines.push(`Applies to: ${APPLIES_TO[a.siteVersion]}`);
      }
      if (a.siteCategory) lines.push(`Topic: ${a.siteCategory}`);

      // Point the bot at the coordinator PDF an answer is published in, so it
      // can cite the document a reader already has.
      for (const key of parseDocs(a.sourceDocs)) {
        const doc = FAQ_DOCUMENTS.find((d) => d.key === key);
        if (doc) lines.push(`Source document: FAQs for ${doc.label} Coordinators — ${SITE_URL}${doc.file}`);
      }
      if (a.publishToSite) lines.push(`Also published at: ${SITE_URL}/faqs`);

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
