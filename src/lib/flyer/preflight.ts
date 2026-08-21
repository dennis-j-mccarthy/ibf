// Preflight checks for a generated flyer IDML against the BigCommerce export
// that produced it. Answers one question: is this file shippable?
//
// Runs in the browser -- the inputs are a 900KB IDML and a 2MB CSV, and neither
// needs a server round trip. XML parsing uses the platform DOMParser.

import { unzipSync, strFromU8 } from 'fflate';

export type Severity = 'pass' | 'warn' | 'fail';

export type Check = {
  id: string;
  label: string;
  severity: Severity;
  summary: string;
  details: string[];
};

export type Book = {
  title: string;
  price: string;
  rawText: string;
  hasAr: boolean;
  linkUrl: string | null;
  /** Slot group this frame belongs to. Two books sharing one slotId means a
   *  leftover frame is overlapping a real book rather than sitting alone. */
  slotId: string;
};

export type FlyerSection = {
  name: string;
  /** One entry per priced text frame, not per slot -- a slot holding two frames
   *  is exactly the defect worth reporting, so nothing here is deduplicated. */
  books: Book[];
};

export type Flyer = {
  sections: FlyerSection[];
  /** Priced text frames that sit outside every section group -- leftovers the generator never replaced. */
  orphanPriced: string[];
  /** URL destinations defined in designmap but not bound to a page item. */
  unboundDestinations: number;
};

export type BcProduct = { sku: string; name: string; categories: string[]; hasAr: boolean };

const STORE_HOST = 'store.ignatiusbookfairs.com';

/** Lowercase alphanumerics only -- survives punctuation and spacing drift between BC and the flyer. */
export function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Story text lives only in <Content> elements. Reading textContent off the
 * Story would also pick up <AppliedFont> names and point sizes, which look like
 * part of the title and quietly break every title comparison.
 */
function storyText(story: Element): string {
  return Array.from(story.getElementsByTagName('Content'))
    .map((c) => c.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- IDML

export function parseFlyer(bytes: Uint8Array): Flyer {
  const files = unzipSync(bytes);
  const read = (name: string) => strFromU8(files[name]);
  const namesIn = (dir: string) => Object.keys(files).filter((n) => n.startsWith(dir) && n.endsWith('.xml'));
  const parser = new DOMParser();
  const xml = (src: string) => parser.parseFromString(src, 'application/xml');

  // story id -> plain text
  const stories = new Map<string, string>();
  for (const name of namesIn('Stories/')) {
    const doc = xml(read(name));
    for (const story of Array.from(doc.getElementsByTagName('Story'))) {
      const self = story.getAttribute('Self');
      if (self) stories.set(self, storyText(story));
    }
  }

  // hyperlinks: page item -> URL, resolved through designmap's unique keys
  const linkForItem = new Map<string, string>();
  let unboundDestinations = 0;
  if (files['designmap.xml']) {
    const doc = xml(read('designmap.xml'));
    const destByKey = new Map<string, string>();
    for (const d of Array.from(doc.getElementsByTagName('HyperlinkURLDestination'))) {
      const key = d.getAttribute('DestinationUniqueKey');
      if (key) destByKey.set(key, d.getAttribute('DestinationURL') ?? '');
    }
    const itemBySource = new Map<string, string>();
    for (const s of Array.from(doc.getElementsByTagName('HyperlinkPageItemSource'))) {
      const self = s.getAttribute('Self');
      const item = s.getAttribute('SourcePageItem');
      if (self && item) itemBySource.set(self, item);
    }
    const usedKeys = new Set<string>();
    for (const h of Array.from(doc.getElementsByTagName('Hyperlink'))) {
      const key = h.getAttribute('DestinationUniqueKey');
      const item = itemBySource.get(h.getAttribute('Source') ?? '');
      if (key) usedKeys.add(key);
      if (key && item) linkForItem.set(item, destByKey.get(key) ?? '');
    }
    unboundDestinations = destByKey.size - usedKeys.size;
  }

  const priced = /\$\d/;
  const sections: FlyerSection[] = [];
  const claimed = new Set<string>();

  for (const name of namesIn('Spreads/')) {
    const doc = xml(read(name));
    for (const group of Array.from(doc.getElementsByTagName('Group'))) {
      const gname = group.getAttribute('Name') ?? '';
      if (!gname.endsWith(' Group')) continue;

      const section: FlyerSection = { name: gname.replace(/ Group$/, ''), books: [] };
      for (const slot of Array.from(group.children)) {
        if (slot.tagName !== 'Group' || slot.getAttribute('Name') === 'ar') continue;

        const slotId = slot.getAttribute('Self') ?? '';
        const hasAr = Array.from(slot.getElementsByTagName('Group')).some((g) => g.getAttribute('Name') === 'ar');
        let linkUrl: string | null = null;
        for (const el of Array.from(slot.getElementsByTagName('*'))) {
          const self = el.getAttribute('Self');
          if (self && linkForItem.has(self)) linkUrl = linkForItem.get(self)!;
        }
        if (!linkUrl && slotId && linkForItem.has(slotId)) linkUrl = linkForItem.get(slotId)!;

        for (const tf of Array.from(slot.getElementsByTagName('TextFrame'))) {
          const rawText = stories.get(tf.getAttribute('ParentStory') ?? '') ?? '';
          if (!priced.test(rawText)) continue;
          claimed.add(rawText);
          const m = rawText.match(/^(.*?)\s*(\$[\d.,]+)\s*$/);
          section.books.push({
            title: (m ? m[1] : rawText).trim(),
            price: m ? m[2] : '',
            rawText,
            hasAr,
            linkUrl,
            slotId,
          });
        }
      }
      if (section.books.length) sections.push(section);
    }
  }

  const orphanPriced: string[] = [];
  for (const t of stories.values()) {
    if (priced.test(t) && !claimed.has(t)) orphanPriced.push(t);
  }

  return { sections, orphanPriced, unboundDestinations };
}

// ---------------------------------------------------------------- BigCommerce

/** Rows come from PapaParse with headers; only the columns the checks need are read. */
export function parseProducts(rows: Record<string, string>[]): BcProduct[] {
  const out: BcProduct[] = [];
  for (const r of rows) {
    if ((r['Item'] ?? '').trim() !== 'Product') continue;
    let hasAr = false;
    const cf = (r['Custom Fields'] ?? '').trim();
    if (cf) {
      try {
        const parsed: unknown = JSON.parse(cf);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        hasAr = list.some((d) => String((d as { name?: unknown })?.name ?? '').trim().toUpperCase() === 'AR');
      } catch {
        // A row with unparseable custom fields simply has no AR flag.
      }
    }
    out.push({
      sku: (r['SKU'] ?? '').trim(),
      name: (r['Name'] ?? '').trim(),
      categories: (r['Categories'] ?? '').match(/\d+/g) ?? [],
      hasAr,
    });
  }
  return out;
}

export function productsInCategory(products: BcProduct[], categoryId: string): BcProduct[] {
  return categoryId ? products.filter((p) => p.categories.includes(categoryId)) : [];
}

/**
 * Best-guess category id for each flyer section, by title overlap. Convenience
 * only -- the report always shows the score so a bad guess is visible rather
 * than silently validating the flyer against whatever category fits best.
 */
export function detectCategoryIds(flyer: Flyer, products: BcProduct[]): Record<string, string> {
  const ids = new Set<string>();
  for (const p of products) for (const c of p.categories) ids.add(c);

  const out: Record<string, string> = {};
  for (const section of flyer.sections) {
    const want = new Set(section.books.map((b) => norm(b.title)));
    let best = '';
    let bestScore = 0;
    for (const id of ids) {
      const members = productsInCategory(products, id);
      // Penalise catch-all categories: an "all books" category contains
      // everything and would otherwise win every section.
      if (!members.length || members.length > want.size * 3) continue;
      const hits = members.filter((p) => want.has(norm(p.name))).length;
      const score = hits / Math.max(members.length, want.size);
      if (hits > 0 && score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (best) out[section.name] = best;
  }
  return out;
}

// ---------------------------------------------------------------- checks

export function runChecks(
  flyer: Flyer,
  products: BcProduct[],
  categoryIds: Record<string, string>,
): Check[] {
  const checks: Check[] = [];
  const totalSlots = flyer.sections.reduce((n, s) => n + s.books.length, 0);

  // --- coverage: does each section hold exactly its category's products?
  const details: string[] = [];
  let worst: Severity = 'pass';
  let mapped = 0;
  for (const section of flyer.sections) {
    const id = categoryIds[section.name] ?? '';
    if (!id) {
      details.push(`${section.name}: no category id set — ${section.books.length} books unchecked`);
      if (worst === 'pass') worst = 'warn';
      continue;
    }
    mapped++;
    const members = productsInCategory(products, id);
    const inFlyer = new Set(section.books.map((b) => norm(b.title)));
    const inBc = new Set(members.map((p) => norm(p.name)));
    const missing = members.filter((p) => !inFlyer.has(norm(p.name)));
    const extra = section.books.filter((b) => !inBc.has(norm(b.title)));

    if (!missing.length && !extra.length) {
      details.push(`${section.name} (cat ${id}): ${section.books.length}/${members.length} match`);
    } else {
      worst = 'fail';
      details.push(`${section.name} (cat ${id}): ${section.books.length} books vs ${members.length} in category`);
      for (const p of missing) details.push(`    in category, missing from flyer: ${p.name} [${p.sku}]`);
      for (const b of extra) details.push(`    in flyer, not in category: ${b.title}`);
    }
  }
  checks.push({
    id: 'coverage',
    label: 'Books match the category',
    severity: worst,
    summary:
      worst === 'pass'
        ? `All ${mapped} sections match BigCommerce (${totalSlots} books)`
        : worst === 'warn'
          ? 'Some sections have no category id set'
          : 'Flyer and category disagree',
    details,
  });

  // --- links
  const linkDetails: string[] = [];
  const allBooks = flyer.sections.flatMap((s) => s.books);
  const missingLink = allBooks.filter((b) => !b.linkUrl);
  const badUrl = allBooks.filter((b) => b.linkUrl && !b.linkUrl.startsWith(`https://${STORE_HOST}/`));
  const seen = new Map<string, string[]>();
  for (const b of allBooks) {
    if (!b.linkUrl) continue;
    if (!seen.has(b.linkUrl)) seen.set(b.linkUrl, []);
    seen.get(b.linkUrl)!.push(b.title);
  }
  const dupes = Array.from(seen.entries()).filter(([, t]) => t.length > 1);
  for (const b of missingLink) linkDetails.push(`no link: ${b.title}`);
  for (const b of badUrl) linkDetails.push(`malformed: ${b.title} -> ${b.linkUrl}`);
  for (const [url, titles] of dupes) linkDetails.push(`same URL on ${titles.length} books: ${url}`);
  if (flyer.unboundDestinations > 0) {
    linkDetails.push(
      `${flyer.unboundDestinations} unused URL destinations left over from the template (cosmetic — not on the page)`,
    );
  }
  const linkFail = missingLink.length + badUrl.length + dupes.length;
  checks.push({
    id: 'links',
    label: 'Store links',
    severity: linkFail ? 'fail' : 'pass',
    summary: linkFail
      ? `${linkFail} link problem${linkFail === 1 ? '' : 's'}`
      : `All ${allBooks.length} books link to ${STORE_HOST}, no duplicates`,
    details: linkDetails,
  });

  // --- AR badges. Presence of the AR custom field is the only source of truth;
  // the Badge field is deliberately ignored even when it reads "Accelerated Reader".
  const arDetails: string[] = [];
  const byName = new Map<string, BcProduct>();
  for (const p of products) byName.set(norm(p.name), p);
  let arExpected = 0;
  let arWrong = 0;
  for (const section of flyer.sections) {
    for (const book of section.books) {
      const p = byName.get(norm(book.title));
      if (!p) continue;
      if (p.hasAr) arExpected++;
      if (p.hasAr && !book.hasAr) {
        arWrong++;
        arDetails.push(`missing AR badge: ${book.title} [${p.sku}]`);
      } else if (!p.hasAr && book.hasAr) {
        arWrong++;
        arDetails.push(`AR badge but product is not AR: ${book.title}`);
      }
    }
  }
  checks.push({
    id: 'ar',
    label: 'AR badges',
    severity: arWrong ? 'fail' : 'pass',
    summary: arWrong ? `${arWrong} badge mismatch${arWrong === 1 ? '' : 'es'}` : `${arExpected} AR badge${arExpected === 1 ? '' : 's'}, all correct`,
    details: arDetails,
  });

  // --- leftovers from the template
  const leftovers: string[] = [];
  for (const t of flyer.orphanPriced) leftovers.push(`outside every section: ${t}`);
  for (const section of flyer.sections) {
    // Generated titles carry no SKU, so one that still does was never replaced.
    for (const book of section.books) {
      if (/\b(?:IBC|IP)\.[A-Za-z0-9]+\b/.test(book.title)) {
        leftovers.push(`raw SKU left in title: ${section.name} — ${book.title}`);
      }
    }
    // Two priced frames in one slot means a leftover is sitting on top of a
    // real book, which usually also hides a product that should have printed.
    const bySlot = new Map<string, Book[]>();
    for (const book of section.books) {
      if (!bySlot.has(book.slotId)) bySlot.set(book.slotId, []);
      bySlot.get(book.slotId)!.push(book);
    }
    for (const [, books] of bySlot) {
      if (books.length > 1) {
        leftovers.push(
          `${books.length} priced frames stacked in one slot (${section.name}): ${books.map((b) => b.title).join('  +  ')}`,
        );
      }
    }
  }
  checks.push({
    id: 'leftovers',
    label: 'Template leftovers',
    severity: leftovers.length ? 'fail' : 'pass',
    summary: leftovers.length
      ? `${leftovers.length} frame${leftovers.length === 1 ? '' : 's'} still holding template content`
      : 'No leftover template content',
    details: leftovers,
  });

  return checks;
}
