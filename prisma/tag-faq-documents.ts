// Tags knowledge-base answers with the published coordinator FAQ PDF(s) they
// appear in, using the extraction in bot-knowledge.pdf-faqs.json.
//
//   npx tsx --env-file=.env.local prisma/tag-faq-documents.ts          # dry run
//   npx tsx --env-file=.env.local prisma/tag-faq-documents.ts --apply
//
// Half the questions in those PDFs appear in more than one document, so tags
// accumulate rather than overwrite: a question found in both the Catholic and
// Public books ends up tagged with both.
//
// The Parish PDF (faq-in-person-parish.pdf) is image-only, so its questions
// cannot be extracted without OCR. Parish tagging is left to a human via the
// document chips in the admin list.

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { serializeDocs, parseDocs, answerToText } from '../src/lib/bot-knowledge';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Extraction source filename -> document key in FAQ_DOCUMENTS.
const FILE_TO_DOC: Record<string, string> = {
  'faqs-in-person-catholic-3-12.pdf': 'catholic-in-person',
  'faq-in-person-public-4-17.pdf': 'public-in-person',
  'faqs-virtual-3-12.pdf': 'virtual',
};

type Extracted = { question: string; answer: string; source: string };

const normQ = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s: string) =>
  new Set(answerToText(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));

function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}

async function main() {
  const extracted: Extracted[] = JSON.parse(
    readFileSync('prisma/bot-knowledge.pdf-faqs.json', 'utf8')
  );
  const kb = await prisma.botAnswer.findMany();

  console.log(`Extracted PDF answers: ${extracted.length}`);
  console.log(`KB entries:            ${kb.length}\n`);

  // Accumulate document keys per KB row.
  const add = new Map<number, Set<string>>();
  const unmatched: string[] = [];

  for (const e of extracted) {
    const doc = FILE_TO_DOC[e.source];
    if (!doc) continue;
    const candidates = kb.filter((k) => normQ(k.question) === normQ(e.question));
    if (!candidates.length) {
      unmatched.push(`${e.source}: ${e.question.slice(0, 60)}`);
      continue;
    }
    // Same question can exist several times in the KB (one per document
    // variant), so attach the tag to the row whose answer matches best.
    let best = candidates[0];
    let bestScore = -1;
    for (const c of candidates) {
      const s = similarity(c.answer, e.answer);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    add.set(best.id, (add.get(best.id) ?? new Set()).add(doc));
  }

  const rows = [...add.entries()].map(([id, docs]) => {
    const row = kb.find((k) => k.id === id)!;
    const merged = serializeDocs([...parseDocs(row.sourceDocs), ...docs]);
    return { id, question: row.question, from: row.sourceDocs, to: merged };
  });

  const changing = rows.filter((r) => r.from !== r.to);
  console.log(`Answers that will gain document tags: ${changing.length}`);
  for (const r of changing) console.log(`   ${r.to?.padEnd(42)} ${r.question.slice(0, 58)}`);

  const byDoc = new Map<string, number>();
  for (const r of rows) for (const d of parseDocs(r.to)) byDoc.set(d, (byDoc.get(d) ?? 0) + 1);
  console.log('\nTag totals:');
  for (const [d, n] of [...byDoc].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)}  ${d}`);
  console.log(`   ${String(0).padStart(3)}  parish-in-person  (image-only PDF — needs OCR or manual tagging)`);

  if (unmatched.length) {
    console.log(`\nExtracted questions with no KB match: ${unmatched.length}`);
    for (const u of unmatched) console.log(`   ! ${u}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.');
    return;
  }

  for (const r of changing) {
    await prisma.botAnswer.update({ where: { id: r.id }, data: { sourceDocs: r.to } });
  }
  console.log(`\nDone. Tagged ${changing.length} answers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
