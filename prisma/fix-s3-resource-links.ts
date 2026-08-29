// Every resource still pointing at ignatius-book-fair.s3.us-east-2.amazonaws.com
// is a dead link: the bucket returns 403 Access Denied to the public. Each of
// those files already exists in public/documents, so this repoints the live
// Resource rows at our own site.
//
//   npx tsx --env-file=.env.local prisma/fix-s3-resource-links.ts          # dry run
//   npx tsx --env-file=.env.local prisma/fix-s3-resource-links.ts --apply

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const S3 = 'ignatius-book-fair.s3';

async function main() {
  const rows = await prisma.resource.findMany({ where: { fileUrl: { contains: S3 } } });
  console.log(`Resources pointing at the private S3 bucket: ${rows.length}\n`);

  const fixes: { id: number; title: string; from: string; to: string }[] = [];
  const orphans: { id: number; title: string; from: string }[] = [];

  for (const r of rows) {
    // Narrowing for TypeScript: fileUrl is nullable on the model, though the
    // query above can only return rows where it contains the bucket host.
    if (!r.fileUrl) continue;
    const base = decodeURIComponent(new URL(r.fileUrl).pathname.split('/').pop() ?? '');
    // S3 keys wrote spaces as "+"; the file on disk may use either form.
    const candidates = [base, base.replace(/\+/g, ' ')];
    const hit = candidates.find((c) => fs.existsSync(path.join('public', 'documents', c)));
    if (hit) {
      fixes.push({ id: r.id, title: r.title, from: r.fileUrl, to: `/documents/${encodeURIComponent(hit)}` });
    } else {
      orphans.push({ id: r.id, title: r.title, from: r.fileUrl });
    }
  }

  for (const f of fixes) console.log(`  #${f.id} ${f.title}\n      -> ${f.to}`);
  for (const o of orphans) console.log(`  #${o.id} ${o.title} — NO LOCAL COPY, needs the file: ${o.from}`);

  if (!APPLY) {
    console.log(`\nDRY RUN — ${fixes.length} would be repointed, ${orphans.length} need files. Add --apply.`);
    return;
  }

  for (const f of fixes) {
    await prisma.resource.update({ where: { id: f.id }, data: { fileUrl: f.to } });
  }
  const left = await prisma.resource.count({ where: { fileUrl: { contains: S3 } } });
  console.log(`\nRepointed ${fixes.length}. Resources still on the S3 bucket: ${left}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
