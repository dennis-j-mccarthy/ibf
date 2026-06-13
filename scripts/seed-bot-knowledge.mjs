/**
 * Generate the chatbot knowledge base (BotAnswer rows) from existing site content.
 *
 * Audiences are kept SEPARATE for later refinement:
 *   "Catholic School" | "Parish" | "Public" | "Virtual" | "All"
 *
 * Sources:
 *   - 43 active FAQs (read live from the DB; FAQ.version -> audience)
 *   - Authored Q&A below, grounded in the operational checklists / guides
 *
 * Usage:
 *   # dry run (default): writes prisma/bot-knowledge.preview.json, NO DB writes
 *   DATABASE_URL="<neon-url>" node scripts/seed-bot-knowledge.mjs
 *
 *   # commit: upserts into BotAnswer by slug
 *   DATABASE_URL="<neon-url>" node scripts/seed-bot-knowledge.mjs --commit
 */
import { neon } from '@neondatabase/serverless';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// Coordinator FAQ Q&A extracted from PDFs (run scripts/extract-faq-pdfs.py first).
const PDF_FAQS_PATH = 'prisma/bot-knowledge.pdf-faqs.json';

const COMMIT = process.argv.includes('--commit');
const OUT = 'prisma/bot-knowledge.preview.json';

const DB = process.env.DATABASE_URL;
if (!DB) {
  console.error('DATABASE_URL is not set. Pass it explicitly (see header).');
  process.exit(1);
}
const sql = neon(DB);

// FAQ.version -> audience bucket. "Both" becomes "All" (shared across audiences).
const FAQ_AUDIENCE = { Both: 'All', Catholic: 'Catholic School', Public: 'Public' };

// FAQs that bundle many sub-questions into one answer — excluded from the raw
// import and replaced by atomic entries in AUTHORED below.
//   52 = "What if my school or parish is too small..." (an entire virtual-fair FAQ)
const EXCLUDE_FAQ_IDS = new Set([52]);

// Convert stored FAQ HTML to clean plain text: block tags -> newlines, drop
// other tags, unescape common entities, collapse excess whitespace.
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&hellip;/gi, '…')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim();
}

function slugify(input) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'answer'
  );
}

// --- Authored Q&A, grounded in checklist-items.ts timelines + virtual resources.
// Kept conservative: only facts present in the source content. Refine per audience later.
const AUTHORED = [
  // ---------------- Catholic School (catholic-in-person) ----------------
  {
    audience: 'Catholic School',
    category: 'Timeline',
    question: 'What is the planning timeline for a Catholic school in-person book fair?',
    answer:
      'Planning starts about 90 days out. Key milestones: a 3-part Live Workshop Series (90, 60, and 30 days before), create your Admin Account (~80 days), Save-the-Date announcement (~6 weeks), a second Save-the-Date and Sneak Peek (~4 weeks), distribute student wishlists (~18 days), the principal/parent letter and email campaign (~2 weeks), a pulpit announcement (~10 days), and your book delivery (~1 week before). The fair then runs for 7 days with a daily activity for each day.',
  },
  {
    audience: 'Catholic School',
    category: 'Timeline',
    question: 'When are the live training workshops for a Catholic school fair?',
    answer: 'The Live Workshop Series has three parts, scheduled 90, 60, and 30 days before your fair.',
  },
  {
    audience: 'Catholic School',
    category: 'Logistics',
    question: 'When do my books arrive for a Catholic school in-person fair?',
    answer: 'Your book delivery arrives about one week (7 days) before your fair start date.',
  },
  {
    audience: 'Catholic School',
    category: 'Promotion',
    question: 'When should I send the principal/parent letter for a Catholic school fair?',
    answer:
      'Send the principal/parent letter about 2 weeks before the fair, together with your email campaign. A pulpit announcement follows around 10 days before.',
  },
  {
    audience: 'Catholic School',
    category: 'Logistics',
    question: 'How long does a Catholic school in-person book fair run?',
    answer:
      'The fair runs 7 days, each with a suggested activity — Day 1 reading challenge kickoff, shopping-hours reminders, reading recommendations, top sellers, and a final-day push.',
  },

  // ---------------- Parish (parish-in-person) ----------------
  {
    audience: 'Parish',
    category: 'Timeline',
    question: 'What is the planning timeline for a parish in-person book fair?',
    answer:
      'Planning starts about 90 days out with a 3-part Live Workshop Series (90, 60, and 30 days before). Then: Save-the-Date (~6 weeks), share the "What Makes an Ignatius Book Fair Special" video (~5 weeks), a social media reminder (~4 weeks), staff picks and recommendations (~3 weeks), a Pastor Invitation (~2 weeks), and your book delivery (~1 week before). The fair runs 7 days with a daily activity.',
  },
  {
    audience: 'Parish',
    category: 'Promotion',
    question: 'When should I invite our pastor for a parish book fair?',
    answer:
      'Send the Pastor Invitation about 2 weeks before the fair. A pulpit announcement resource is provided to help promote it to the congregation.',
  },
  {
    audience: 'Parish',
    category: 'Logistics',
    question: 'When do books arrive for a parish in-person fair?',
    answer: 'Your book delivery arrives about one week (7 days) before the fair begins.',
  },
  {
    audience: 'Parish',
    category: 'Logistics',
    question: 'How long does a parish in-person book fair run?',
    answer:
      'The fair runs 7 days, with a suggested activity each day — reading challenge kickoff, shopping reminders, recommendations, top sellers, and a final day.',
  },

  // ---------------- Public (public-in-person) ----------------
  {
    audience: 'Public',
    category: 'Timeline',
    question: 'What is the planning timeline for a public school in-person book fair?',
    answer:
      'Planning starts about 90 days out: Training Workshop Part 1 (~90 days) and Part 2 (~60 days), a blue Save-the-Date (~6 weeks), a yellow Save-the-Date (~4 weeks), staff picks (~3 weeks), distribute student wishlists (~18 days), a letter to the principal (~2 weeks), and your book delivery (~1 week before). The fair then runs 7 days with daily activities.',
  },
  {
    audience: 'Public',
    category: 'Timeline',
    question: 'When are the training workshops for a public school fair?',
    answer: 'There are two training workshops, scheduled about 90 and 60 days before your fair.',
  },
  {
    audience: 'Public',
    category: 'Promotion',
    question: 'When should I distribute student wishlists for a public school fair?',
    answer: 'Distribute student wishlists about 18 days before the fair, ahead of the principal letter at ~2 weeks.',
  },
  {
    audience: 'Public',
    category: 'Logistics',
    question: 'When do books arrive for a public school in-person fair?',
    answer: 'Your book delivery arrives about one week (7 days) before the fair start date.',
  },

  // ---------------- Virtual (catholic-virtual) ----------------
  {
    audience: 'Virtual',
    category: 'Timeline',
    question: 'What is the planning timeline for a virtual book fair?',
    answer:
      'Planning starts about 7 weeks out: set up your fair and invite teachers (~7 weeks), Save-the-Date (~6 weeks), share the intro video (~5 weeks), a social media reminder (~4 weeks), share the digital catalog and staff picks (~3 weeks), a principal/pastor letter (~2 weeks), and a backpack flyer (~1 week). The fair then runs 7 days, promoted through social posts and the digital catalog.',
  },
  {
    audience: 'Virtual',
    category: 'Logistics',
    question: 'How is a virtual book fair different from an in-person fair?',
    answer:
      'A virtual fair has no physical book delivery — families shop through an online digital catalog. Setup begins earlier (about 7 weeks out, including inviting teachers), and promotion runs through backpack flyers, fillable social media posts, and the digital catalog rather than an on-site table.',
  },
  {
    audience: 'Virtual',
    category: 'Setup',
    question: 'When do I set up my virtual book fair and invite teachers?',
    answer: 'Set up your fair and invite teachers about 7 weeks before the fair start date.',
  },
  {
    audience: 'Virtual',
    category: 'Logistics',
    question: 'Is there a digital catalog for a virtual book fair?',
    answer:
      'Yes. A Digital Catalog is available for families to browse during a virtual fair, and you can share it as part of your promotion starting about 3 weeks before the fair.',
  },
  {
    audience: 'Virtual',
    category: 'Support',
    question: 'Where can virtual coordinators find help and a checklist?',
    answer:
      'A Virtual Book Fair Operational Guide, a printable Virtual Book Fair Checklist, and a dedicated "FAQs for Virtual Book Fair Coordinators" are available in your coordinator resources — covering planning, materials, payments, shipping, Ave Dollars, and support.',
  },

  // --- Split out of FAQ#52 ("too small for an in-person book fair") ---
  // (cost intentionally omitted — covered by FAQ#35 "How much does a virtual book fair cost?")
  {
    audience: 'Virtual',
    category: 'Overview',
    question: 'What if my school or parish is too small for an in-person book fair?',
    answer:
      'Ignatius Book Fairs offers a virtual book fair, which is ideal for smaller schools — it requires much less volunteer time and effort to organize. This option is also available to larger schools that prefer not to host a full onsite book fair.',
  },
  {
    audience: 'Virtual',
    category: 'Pricing',
    question: 'Is there a minimum sales requirement for a virtual book fair?',
    answer:
      'There is no strict minimum, but we ask that you feel confident you have enough community support to generate at least $1,000 in sales.',
  },
  {
    audience: 'Virtual',
    category: 'Logistics',
    question: 'What do you send us for a virtual book fair?',
    answer:
      'About one week before your virtual fair begins, your organization receives an official virtual book fair kit: 50 book fair flyers, 50 bookmarks, and the selection of our most popular best-selling books you opted to receive. You may keep these books or re-sell them at list price after the fair concludes.',
  },
  {
    audience: 'Virtual',
    category: 'Payments',
    question: 'How are books purchased during a virtual book fair?',
    answer:
      'All shopping is done on our website, store.ignatiusbookfairs.com, with payment by credit card. Customers create an online account, select your school, and start shopping. Note: if you choose to re-sell the sample books after the fair, your organization is responsible for collecting payment (check, cash, FACTS, etc.).',
  },
  {
    audience: 'Virtual',
    category: 'Rewards',
    question: 'Does our organization earn rewards from a virtual book fair?',
    answer:
      'Yes. Your organization earns "Ave Dollars," redeemable on our website for books. We offer 30% of all online sales (excluding tax) in Ave Dollars once sales exceed $3,000. For example: $1,000 earns $300, $2,000 earns $600, $3,000 earns $900, and over $3,000 earns $900 plus $75 in surprise bonus books.',
  },
  {
    audience: 'Virtual',
    category: 'Logistics',
    question: 'How long does a virtual book fair last, and how are orders shipped?',
    answer:
      'The online book fair runs 7 days. Plan to promote shopping before, during, and after the event. Books ordered during the fair can be held and shipped to your organization with FREE shipping, and your organization distributes them.',
  },
  {
    audience: 'Virtual',
    category: 'Promotion',
    question: 'What work is required from our organization for a virtual fair?',
    answer:
      'Your main role is advertising the event through every channel you have — newsletters, social media, parish bulletin, the official calendar, and more. Advertise often leading up to the fair and each day during it; if your community forgets it is happening, they won’t order. We provide a comprehensive set of advertising resources, and strategy is covered in our live workshop for virtual coordinators (a recording is sent even if you can’t attend).',
  },
  {
    audience: 'Virtual',
    category: 'Promotion',
    question: 'How do we advertise a virtual book fair?',
    answer:
      'We send a digital kit with social media graphics, a wishlist, a digital catalog, and instructions on how to use them. Advertising is also covered in depth in our live workshop built specifically for virtual fair coordinators.',
  },
  {
    audience: 'Virtual',
    category: 'After the fair',
    question: 'What happens after a virtual book fair ends?',
    answer:
      'We notify you of your total online sales and add your earned Ave Dollars to your account so you can start redeeming the rewards you have earned.',
  },
  {
    audience: 'Virtual',
    category: 'Getting started',
    question: 'How do we schedule a virtual book fair?',
    answer: 'Contact a Book Fair Pro to get started.',
  },
];

// --- Authored from the operational GUIDE PDFs (/tmp/ibf-pdf/guide-*.txt).
// Shared in-person setup is tagged "In-Person" (Catholic/Public/Parish, not Virtual);
// audience-specific nuance is tagged to its bucket. Consolidation removes any overlap.
const GUIDE_AUTHORED = [
  // ----- In-Person shared setup (applies to Catholic School / Parish / Public) -----
  {
    audience: 'In-Person',
    category: 'Room setup',
    question: 'How much space and how many tables do I need to set up an in-person book fair?',
    answer:
      'Plan for a space of at least 800 square feet and 12-16 six-foot tables (or the equivalent) — smaller organizations use the lower number, larger ones the higher. Arrange tables away from the walls so titles are visible from both sides. A typical layout: Early Readers (1 table), Picture Books (2-3), Elementary (3), Middle School (1-3), Seasonal (1), Crafts & Activities (1), Comic Books (1), Older Readers & Adults (1), Toys & Trinkets (1), and a Check-out station (1-2).',
  },
  {
    audience: 'In-Person',
    category: 'Volunteers',
    question: 'Do I need volunteers for an in-person fair, and what do they do?',
    answer:
      'Yes — Ignatius Book Fairs sends nearly everything except volunteers, so recruit a team (a free tool like SignUpGenius works well). Volunteers help promote the fair, empty boxes and set up, scan in inventory, work the floor and suggest books, run refreshments and a kids’ craft table at events, post on social media, run check-out, and pack up and clean up afterward.',
  },
  {
    audience: 'In-Person',
    category: 'Delivery & setup',
    question: 'What arrives in my delivery and how do I set it up?',
    answer:
      'About one week before your fair you’ll receive 20-38 boxes (depending on your size), sorted by category with a 4x6 packing-slip label on each box. Setup order: (1) open the box marked "Open First" and charge the 2 payment devices; (2) find the marketing box, set up tables with tablecloths, category signs, and 2-3 book stands per table; (3) log into a payment device with your unique code and scan in each box to load your inventory; (4) place boxes in front of the matching category tables; (5) unbox and arrange the books so titles are visible from every side.',
  },
  {
    audience: 'In-Person',
    category: 'Materials',
    question: 'What decorations and display materials are included, and what do I supply myself?',
    answer:
      'Included with your delivery: rectangular tablecloths in mint, yellow, and orange; table category signs in clear acrylic frames; 50 book stands; and 5 decorative posters. You supply: bags for purchases, a cashbox for cash sales, a Sharpie marker, and packing tape. Beyond the basics, decorate to make it your own — seasonal or book themes and artwork from younger students all add to the experience.',
  },
  {
    audience: 'In-Person',
    category: 'Scheduling',
    question: 'Should I keep the fair open during evenings or weekends?',
    answer:
      'It’s recommended. Keeping the fair open one or more evenings and/or over the weekend gives more families a chance to shop. Consider hosting an evening event with a snack and a beverage so people can socialize while they browse, and think about who else in your community you could reach — families at other schools, homeschoolers, and co-ops.',
  },
  {
    audience: 'In-Person',
    category: 'Online ordering',
    question: 'Can families order online during an in-person fair, and is there free shipping?',
    answer:
      'Yes. Families can shop online and should select your organization from the drop-down menu so the purchase counts toward your rewards. Free shipping to your office/school is available during the dates of the fair, and free shipping (contiguous US) applies to any order over $15.',
  },

  // ----- Catholic School nuance -----
  {
    audience: 'Catholic School',
    category: 'Promotion',
    question: 'Where should I advertise a Catholic school book fair?',
    answer:
      'Spread the word widely: the parish bulletin, parish calendar, parish email list, and an announcement from the pulpit; the school newsletter, school paper, and school/parish websites and social media (Facebook, Instagram, X). Also consider inviting local parishes in the same diocese, posting library flyers, and reaching homeschoolers, co-ops, and nearby schools.',
  },
  {
    audience: 'Catholic School',
    category: 'Mission',
    question: 'What makes an Ignatius book fair different for a Catholic school?',
    answer:
      'Beyond putting quality books and merchandise into children’s hands, an Ignatius Book Fair helps strengthen their faith at the same time. The selection includes faith-building Catholic titles alongside engaging books and activities, and proceeds help your school purchase new books for its library and classrooms.',
  },
];

// Normalize a question for grouping (drop punctuation + audience filler words).
function normQ(q) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(for|my|our|your|a|an|the|to|of|in|do|does|is|are|we|i)\b/g, ' ')
    .replace(/\b(catholic|parish|public|virtual|school|fair|book)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function wordSet(s) {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3)
  );
}
function answerSim(a, b) {
  const A = wordSet(a), B = wordSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

// Collapse redundancy while preserving nuance:
//   - same question + near-identical answer across audiences -> one "All" entry
//   - same question + different answer  -> kept per audience (the nuance)
//   - duplicates within an audience     -> keep the richest answer
const MERGE_THRESHOLD = 0.78;
function consolidate(entries) {
  const groups = new Map();
  for (const e of entries) {
    const k = normQ(e.question);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const out = [];
  let collapsed = 0;
  for (const group of groups.values()) {
    let remaining = [...group];
    while (remaining.length) {
      const seed = remaining.shift();
      const cluster = [seed];
      const rest = [];
      for (const e of remaining) {
        if (answerSim(e.answer, seed.answer) >= MERGE_THRESHOLD) cluster.push(e);
        else rest.push(e);
      }
      remaining = rest;
      const richest = cluster.sort((a, b) => b.answer.length - a.answer.length)[0];
      const auds = new Set(cluster.map((c) => c.audience));
      if (auds.size > 1 || auds.has('All') || auds.has('In-Person')) {
        // Decide the merged bucket by SOURCE, not just which audiences matched:
        //   - marketing (DB FAQ) shared across audiences -> "All" (universal)
        //   - operational (PDF/guide) shared across in-person types -> "In-Person"
        //   - anything spanning Virtual or already-"All" -> "All"
        const universal = auds.has('All') || auds.has('Virtual');
        const inPersonOnly = [...auds].every((a) =>
          ['Catholic School', 'Parish', 'Public', 'In-Person'].includes(a)
        );
        const operational = cluster.every(
          (c) =>
            (c.source || '').startsWith('pdf:') ||
            c.source === 'authored' || // authored content is all operational (timelines/guides)
            c.audience === 'In-Person'
        );
        richest.audience = !universal && inPersonOnly && operational ? 'In-Person' : 'All';
      }
      richest.mergedFrom = cluster.length;
      collapsed += cluster.length - 1;
      out.push(richest);
    }
  }
  console.error(`consolidate: ${entries.length} -> ${out.length} (removed ${collapsed} redundant)`);
  return out;
}

function buildEntries(faqRows) {
  let entries = [];
  const usedSlugs = new Set();
  const uniqueSlug = (base) => {
    let s = slugify(base);
    let n = 1;
    while (usedSlugs.has(s)) {
      n += 1;
      s = `${slugify(base)}-${n}`;
    }
    usedSlugs.add(s);
    return s;
  };

  // FAQs (live from DB) -> entries
  for (const r of faqRows) {
    if (EXCLUDE_FAQ_IDS.has(r.id)) continue; // split into atomic entries in AUTHORED
    const audience = FAQ_AUDIENCE[r.version] ?? 'All';
    entries.push({
      question: htmlToText(r.question),
      answer: htmlToText(r.answer),
      slug: uniqueSlug(r.question),
      links: [],
      audience,
      category: r.pageTitle || 'General',
      source: `FAQ#${r.id} (${r.version})`,
    });
  }

  // Coordinator FAQ Q&A extracted from PDFs -> entries
  if (existsSync(PDF_FAQS_PATH)) {
    const pdfFaqs = JSON.parse(readFileSync(PDF_FAQS_PATH, 'utf8'));
    for (const p of pdfFaqs) {
      entries.push({
        question: p.question,
        answer: p.answer,
        slug: uniqueSlug(p.question),
        links: [],
        audience: p.audience,
        category: p.category || 'Coordinator FAQ',
        source: `pdf:${p.source}`,
      });
    }
  }

  // Authored (timelines/virtual split + guide-derived) -> entries
  for (const a of [...AUTHORED, ...GUIDE_AUTHORED]) {
    entries.push({
      question: a.question,
      answer: a.answer,
      slug: uniqueSlug(a.question),
      links: [],
      audience: a.audience,
      category: a.category,
      source: 'authored',
    });
  }

  // Collapse redundancy (preserving audience nuance) before ordering.
  entries = consolidate(entries);

  // order: sequential within each audience
  const counters = {};
  for (const e of entries) {
    counters[e.audience] = (counters[e.audience] ?? 0) + 1;
    e.order = counters[e.audience];
    e.isActive = true;
  }
  return entries;
}

async function main() {
  const faqRows = await sql`
    select id, version, "pageTitle", question, answer
    from "FAQ" where "isActive" = true
    order by version, "order"`;

  const entries = buildEntries(faqRows);

  // Summary by audience
  const byAud = {};
  for (const e of entries) byAud[e.audience] = (byAud[e.audience] ?? 0) + 1;
  console.log('Proposed BotAnswer entries by audience:');
  for (const [a, n] of Object.entries(byAud).sort()) console.log(`  ${a.padEnd(16)} ${n}`);
  console.log(`  ${'TOTAL'.padEnd(16)} ${entries.length}`);

  if (!COMMIT) {
    writeFileSync(OUT, JSON.stringify(entries, null, 2));
    console.log(`\nDRY RUN — no DB writes. Wrote ${entries.length} proposed entries to ${OUT}`);
    console.log('Review/edit that file, then re-run with --commit to load them.');
    return;
  }

  // COMMIT: upsert by slug
  let inserted = 0;
  let updated = 0;
  for (const e of entries) {
    const existing = await sql`select id from "BotAnswer" where slug = ${e.slug} limit 1`;
    const links = JSON.stringify(e.links);
    if (existing.length) {
      await sql`update "BotAnswer" set question=${e.question}, answer=${e.answer},
        links=${links}::jsonb, audience=${e.audience}, category=${e.category},
        "order"=${e.order}, "isActive"=${e.isActive}, "updatedAt"=now() where slug=${e.slug}`;
      updated += 1;
    } else {
      await sql`insert into "BotAnswer" (question, answer, slug, links, audience, category, "order", "isActive", "createdAt", "updatedAt")
        values (${e.question}, ${e.answer}, ${e.slug}, ${links}::jsonb, ${e.audience}, ${e.category}, ${e.order}, ${e.isActive}, now(), now())`;
      inserted += 1;
    }
  }
  console.log(`\nCOMMITTED — inserted ${inserted}, updated ${updated}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
