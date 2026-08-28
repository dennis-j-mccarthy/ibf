import type { Metadata } from 'next';
import { getBotAnswers } from '@/lib/data';
import { answerToHtml, type BotLink } from '@/lib/bot-knowledge';

// Source content for the HubSpot chatbot. Kept reachable (so HubSpot can fetch it)
// but noindex so it never appears in Google or competes with real marketing pages.
export const metadata: Metadata = {
  title: 'Book Fair Help Answers',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function BotKnowledgePage() {
  const answers = await getBotAnswers();

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem', lineHeight: 1.6 }}>
      <h1>Ignatius Book Fairs — Help Answers</h1>
      <p>Common questions about hosting and running an Ignatius Book Fair.</p>
      {answers.map((a) => {
        const links = Array.isArray(a.links) ? (a.links as unknown as BotLink[]) : [];
        return (
          <article key={a.id} id={a.slug} style={{ marginTop: '2rem' }}>
            <h2>{a.question}</h2>
            {/* Authored by admins only, same trust level as FAQ answers. */}
            <div dangerouslySetInnerHTML={{ __html: answerToHtml(a.answer) }} />
            {links.length > 0 && (
              <ul>
                {links.map((l, i) => (
                  <li key={i}>
                    <a href={l.url}>{l.label || l.url}</a>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </main>
  );
}
