import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBotAnswerBySlug } from '@/lib/data';
import type { BotLink } from '@/lib/bot-knowledge';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const answer = await getBotAnswerBySlug(slug);
  return {
    title: answer ? answer.question : 'Help Answer',
    robots: { index: false, follow: false },
  };
}

export default async function BotKnowledgeEntry({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const answer = await getBotAnswerBySlug(slug);
  if (!answer) notFound();

  const links = Array.isArray(answer.links) ? (answer.links as unknown as BotLink[]) : [];

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem', lineHeight: 1.6 }}>
      <h1>{answer.question}</h1>
      {answer.answer.split('\n').filter(Boolean).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      {links.length > 0 && (
        <ul>
          {links.map((l, i) => (
            <li key={i}>
              <a href={l.url}>{l.label || l.url}</a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
