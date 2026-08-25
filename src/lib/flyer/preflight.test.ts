/**
 * @vitest-environment happy-dom
 *
 * Fixture tests for the flyer preflight checks. The IDML fixtures are built
 * in-memory rather than committed as binaries so the shape being asserted is
 * readable in the test itself.
 *
 * These cover the failure modes preflight actually hit in use: story text read
 * through textContent (which swallows font names and point sizes), a leftover
 * template frame stacked inside a live slot, and AR read from the Badge field
 * instead of the AR custom field.
 */
import { describe, it, expect } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import {
  norm,
  parseFlyer,
  parseProducts,
  productsInCategory,
  detectCategoryIds,
  runChecks,
  type BcProduct,
} from './preflight';

// ---------------------------------------------------------------- fixtures

type SlotSpec = {
  /** Story text per priced text frame in this slot. Two entries = stacked frames. */
  frames: string[];
  ar?: boolean;
  /** Store URL bound to the slot via designmap, or none. */
  link?: string;
};

type SectionSpec = { name: string; slots: SlotSpec[] };

/**
 * A Story as InDesign actually writes it: the title and price sit in <Content>,
 * but <AppliedFont> and <PointSize> are siblings under the same Story. Reading
 * textContent picks all four up.
 */
function storyXml(id: string, text: string): string {
  const m = text.match(/^(.*?)\s*(\$[\d.,]+)\s*$/);
  const title = m ? m[1] : text;
  const price = m ? m[2] : '';
  const contents = [title, price]
    .filter(Boolean)
    .map((t) => `<Content>${t}</Content>`)
    .join('\n            ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Story Self="${id}">
    <ParagraphStyleRange>
      <CharacterStyleRange PointSize="10.5">
        <Properties>
          <AppliedFont type="string">Brother 1816</AppliedFont>
        </Properties>
        ${contents}
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>`;
}

function buildIdml(sections: SectionSpec[], orphans: string[] = []): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const stories: string[] = [];
  const dests: string[] = [];
  const sources: string[] = [];
  const links: string[] = [];
  let storyN = 0;
  let destN = 0;

  const spreadBody = sections
    .map((section) => {
      const slots = section.slots
        .map((slot, si) => {
          const slotId = `slot${norm(section.name)}${si}`;
          const frames = slot.frames
            .map((text) => {
              const sid = `story${storyN++}`;
              stories.push(sid);
              files[`Stories/Story_${sid}.xml`] = strToU8(storyXml(sid, text));
              return `<TextFrame Self="tf${sid}" ParentStory="${sid}" />`;
            })
            .join('\n        ');
          if (slot.link) {
            const key = `k${destN++}`;
            dests.push(
              `<HyperlinkURLDestination Self="dest${key}" DestinationUniqueKey="${key}" DestinationURL="${slot.link}" />`,
            );
            sources.push(`<HyperlinkPageItemSource Self="src${key}" SourcePageItem="${slotId}" />`);
            links.push(`<Hyperlink Self="hl${key}" Source="src${key}" DestinationUniqueKey="${key}" />`);
          }
          const ar = slot.ar ? '<Group Name="ar" Self="ar' + slotId + '" />' : '';
          return `      <Group Self="${slotId}">
        ${frames}
        ${ar}
      </Group>`;
        })
        .join('\n');
      return `  <Group Name="${section.name} Group" Self="grp${norm(section.name)}">
${slots}
  </Group>`;
    })
    .join('\n');

  for (const text of orphans) {
    const sid = `story${storyN++}`;
    files[`Stories/Story_${sid}.xml`] = strToU8(storyXml(sid, text));
  }

  files['Spreads/Spread_a.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging">
  <Spread Self="spread1">
${spreadBody}
  </Spread>
</idPkg:Spread>`);

  files['designmap.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<?aid style="50" type="document" readerVersion="6.0"?>
<Document Self="doc">
  ${dests.join('\n  ')}
  ${sources.join('\n  ')}
  ${links.join('\n  ')}
</Document>`);

  return zipSync(files);
}

const STORE = 'https://store.ignatiusbookfairs.com';

// ---------------------------------------------------------------- parseFlyer

describe('parseFlyer', () => {
  it('reads story text from Content only, not font names or point sizes', () => {
    const flyer = parseFlyer(
      buildIdml([
        { name: 'Saintly Reads', slots: [{ frames: ['Young Saints $12.99'], link: `${STORE}/young-saints` }] },
      ]),
    );

    const book = flyer.sections[0].books[0];
    expect(book.title).toBe('Young Saints');
    expect(book.price).toBe('$12.99');
    // The regression: textContent would have produced "10.5 Brother 1816 Young Saints".
    expect(book.title).not.toMatch(/10\.5|Brother/);
  });

  it('keeps both frames when one slot holds two priced frames', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Saintly Reads',
          slots: [{ frames: ['Pray by Sticker: Saints $10.99', 'Young Saints IBC.6YSH $12.99'], link: `${STORE}/pray` }],
        },
      ]),
    );

    const books = flyer.sections[0].books;
    expect(books).toHaveLength(2);
    // One slot, so both inherit the same id -- that shared id is what the
    // stacked-frame check keys off.
    expect(books[0].slotId).toBe(books[1].slotId);
    expect(books.map((b) => b.linkUrl)).toEqual([`${STORE}/pray`, `${STORE}/pray`]);
  });

  it('skips unpriced frames and reports priced stories outside every section', () => {
    const flyer = parseFlyer(
      buildIdml(
        [{ name: 'Plushies', slots: [{ frames: ['It feels like Fall!', 'Lamb Plushie $19.99'], link: `${STORE}/lamb` }] }],
        ['Leftover Template Book $8.99'],
      ),
    );

    expect(flyer.sections[0].books.map((b) => b.title)).toEqual(['Lamb Plushie']);
    expect(flyer.orphanPriced).toEqual(['Leftover Template Book $8.99']);
  });

  it('does not count a hidden AR badge as printed', () => {
    // The generator hides unused badges instead of deleting them, so a present
    // but Visible="false" group must read as no badge.
    const bytes = buildIdml([
      { name: 'Chapter Books', slots: [{ frames: ['Hidden Badge Book $9.99'], ar: true, link: `${STORE}/h` }] },
    ]);
    const hidden = strToU8(
      strFromU8(unzipSync(bytes)['Spreads/Spread_a.xml']).replace('<Group Name="ar"', '<Group Visible="false" Name="ar"'),
    );
    const files = { ...unzipSync(bytes), 'Spreads/Spread_a.xml': hidden };
    const flyer = parseFlyer(zipSync(files));
    expect(flyer.sections[0].books[0].hasAr).toBe(false);
  });

  it('reads the AR badge group and leaves it off slots without one', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Saint Story Chapter Books',
          slots: [
            { frames: ['Joan of Arc: The Girl Soldier $9.99'], ar: true, link: `${STORE}/joan` },
            { frames: ['Another Saint Book $9.99'], link: `${STORE}/another` },
          ],
        },
      ]),
    );

    expect(flyer.sections[0].books.map((b) => b.hasAr)).toEqual([true, false]);
  });

  it('counts URL destinations that no hyperlink uses', () => {
    const bytes = buildIdml([{ name: 'Chapter Books', slots: [{ frames: ['A Book $5.00'], link: `${STORE}/a` }] }]);
    const flyer = parseFlyer(bytes);
    expect(flyer.unboundDestinations).toBe(0);
  });
});

// ---------------------------------------------------------------- parseProducts

describe('parseProducts', () => {
  const row = (over: Record<string, string>): Record<string, string> => ({
    Item: 'Product',
    SKU: 'IBC.X',
    Name: 'A Book',
    Categories: '',
    'Custom Fields': '',
    ...over,
  });

  it('ignores rows that are not products', () => {
    const out = parseProducts([row({}), row({ Item: 'Variant', SKU: 'IBC.X-1' }), row({ Item: '' })]);
    expect(out).toHaveLength(1);
  });

  it('takes AR from the AR custom field', () => {
    const [p] = parseProducts([row({ 'Custom Fields': JSON.stringify([{ name: 'AR', value: 'AR' }]) })]);
    expect(p.hasAr).toBe(true);
  });

  it('never takes AR from the Badge field', () => {
    const [bare] = parseProducts([row({ Badge: 'Accelerated Reader' })]);
    expect(bare.hasAr).toBe(false);
    // The shape that actually occurs in the catalog: custom fields present but
    // carrying something other than AR, with Badge reading "Accelerated Reader".
    const [withCf] = parseProducts([
      row({ Badge: 'Accelerated Reader', 'Custom Fields': JSON.stringify([{ name: 'Lexile', value: '820L' }]) }),
    ]);
    expect(withCf.hasAr).toBe(false);
  });

  it('accepts a single custom-field object as well as an array', () => {
    const [p] = parseProducts([row({ 'Custom Fields': JSON.stringify({ name: 'ar', value: 'AR' }) })]);
    expect(p.hasAr).toBe(true);
  });

  it('treats unparseable custom fields as simply having no AR flag', () => {
    const [p] = parseProducts([row({ 'Custom Fields': '{not json' })]);
    expect(p.hasAr).toBe(false);
  });

  it('pulls category ids out of the Categories column', () => {
    const [p] = parseProducts([row({ Categories: 'Catholic October 2026/477; Saintly Reads/483' })]);
    expect(p.categories).toEqual(['2026', '477', '483']);
  });
});

// ---------------------------------------------------------------- category mapping

describe('detectCategoryIds', () => {
  const products: BcProduct[] = [
    { sku: 'A', name: 'Alpha Book', categories: ['483', '999'], hasAr: false },
    { sku: 'B', name: 'Beta Book', categories: ['483', '999'], hasAr: false },
    { sku: 'C', name: 'Gamma Book', categories: ['484', '999'], hasAr: false },
    { sku: 'D', name: 'Delta Book', categories: ['999'], hasAr: false },
    { sku: 'E', name: 'Epsilon Book', categories: ['999'], hasAr: false },
    { sku: 'F', name: 'Zeta Book', categories: ['999'], hasAr: false },
    { sku: 'G', name: 'Eta Book', categories: ['999'], hasAr: false },
  ];

  it('matches a section to the category it actually belongs to, not the catch-all', () => {
    const flyer = parseFlyer(
      buildIdml([
        { name: 'Saintly Reads', slots: [{ frames: ['Alpha Book $1.00'] }, { frames: ['Beta Book $2.00'] }] },
      ]),
    );
    // 999 holds all seven products, so it shares both titles with the section;
    // it loses on score because score divides by the larger member count.
    expect(detectCategoryIds(flyer, products)['Saintly Reads']).toBe('483');
  });

  it('leaves a section unmapped when nothing overlaps', () => {
    const flyer = parseFlyer(buildIdml([{ name: 'Plushies', slots: [{ frames: ['Unrelated Thing $1.00'] }] }]));
    expect(detectCategoryIds(flyer, products)['Plushies']).toBeUndefined();
  });
});

describe('productsInCategory', () => {
  it('returns nothing for an unset id rather than everything', () => {
    const products: BcProduct[] = [{ sku: 'A', name: 'Alpha', categories: ['1'], hasAr: false }];
    expect(productsInCategory(products, '')).toEqual([]);
  });
});

// ---------------------------------------------------------------- runChecks

const check = (checks: ReturnType<typeof runChecks>, id: string) => checks.find((c) => c.id === id)!;

describe('runChecks', () => {
  it('passes a flyer that matches its category exactly', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Plushies',
          slots: [
            { frames: ['Lamb Plushie $19.99'], link: `${STORE}/lamb` },
            { frames: ['Lion Plushie $19.99'], link: `${STORE}/lion` },
          ],
        },
      ]),
    );
    const products: BcProduct[] = [
      { sku: 'P1', name: 'Lamb Plushie', categories: ['484'], hasAr: false },
      { sku: 'P2', name: 'Lion Plushie', categories: ['484'], hasAr: false },
    ];

    const checks = runChecks(flyer, products, { Plushies: '484' });
    expect(checks.map((c) => c.severity)).toEqual(['pass', 'pass', 'pass', 'pass']);
  });

  it('fails coverage and names both the missing and the extra book', () => {
    const flyer = parseFlyer(
      buildIdml([{ name: 'Plushies', slots: [{ frames: ['Wrong Plushie $19.99'], link: `${STORE}/wrong` }] }]),
    );
    const products: BcProduct[] = [{ sku: 'P1', name: 'Lamb Plushie', categories: ['484'], hasAr: false }];

    const coverage = check(runChecks(flyer, products, { Plushies: '484' }), 'coverage');
    expect(coverage.severity).toBe('fail');
    expect(coverage.details.join('\n')).toContain('missing from flyer: Lamb Plushie [P1]');
    expect(coverage.details.join('\n')).toContain('not in category: Wrong Plushie');
  });

  it('warns rather than fails when a section has no category id', () => {
    const flyer = parseFlyer(
      buildIdml([{ name: 'Plushies', slots: [{ frames: ['Lamb Plushie $19.99'], link: `${STORE}/lamb` }] }]),
    );
    const coverage = check(runChecks(flyer, [], {}), 'coverage');
    expect(coverage.severity).toBe('warn');
    expect(coverage.details[0]).toContain('no category id set');
  });

  it('flags missing, off-host and duplicated links', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Chapter Books',
          slots: [
            { frames: ['No Link Book $1.00'] },
            { frames: ['Off Host Book $2.00'], link: 'https://example.com/book' },
            { frames: ['Shared A $3.00'], link: `${STORE}/shared` },
            { frames: ['Shared B $4.00'], link: `${STORE}/shared` },
          ],
        },
      ]),
    );

    const links = check(runChecks(flyer, [], {}), 'links');
    expect(links.severity).toBe('fail');
    const text = links.details.join('\n');
    expect(text).toContain('no link: No Link Book');
    expect(text).toContain('malformed: Off Host Book');
    expect(text).toContain('same URL on 2 books');
  });

  it('reports an AR badge missing from an AR product', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Saint Story Chapter Books',
          slots: [{ frames: ['Joan of Arc: The Girl Soldier $9.99'], link: `${STORE}/joan` }],
        },
      ]),
    );
    const products: BcProduct[] = [
      { sku: 'IP.SJGSP', name: 'Joan of Arc: The Girl Soldier', categories: ['482'], hasAr: true },
    ];

    const ar = check(runChecks(flyer, products, {}), 'ar');
    expect(ar.severity).toBe('fail');
    expect(ar.details[0]).toContain('missing AR badge: Joan of Arc: The Girl Soldier [IP.SJGSP]');
  });

  it('reports an AR badge on a product that is not AR', () => {
    const flyer = parseFlyer(
      buildIdml([{ name: 'Chapter Books', slots: [{ frames: ['Plain Book $9.99'], ar: true, link: `${STORE}/p` }] }]),
    );
    const products: BcProduct[] = [{ sku: 'X', name: 'Plain Book', categories: ['480'], hasAr: false }];

    const ar = check(runChecks(flyer, products, {}), 'ar');
    expect(ar.severity).toBe('fail');
    expect(ar.details[0]).toContain('AR badge but product is not AR: Plain Book');
  });

  it('catches the stacked-frame defect and the raw SKU that comes with it', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Saintly Reads',
          slots: [{ frames: ['Pray by Sticker: Saints $10.99', 'Young Saints IBC.6YSH $12.99'], link: `${STORE}/pray` }],
        },
      ]),
    );

    const leftovers = check(runChecks(flyer, [], {}), 'leftovers');
    expect(leftovers.severity).toBe('fail');
    const text = leftovers.details.join('\n');
    expect(text).toContain('2 priced frames stacked in one slot (Saintly Reads)');
    expect(text).toContain('Pray by Sticker: Saints  +  Young Saints IBC.6YSH');
    expect(text).toContain('raw SKU left in title');
  });

  it('does not call a one-frame slot stacked', () => {
    const flyer = parseFlyer(
      buildIdml([
        {
          name: 'Saintly Reads',
          slots: [
            { frames: ['Book One $1.00'], link: `${STORE}/one` },
            { frames: ['Book Two $2.00'], link: `${STORE}/two` },
          ],
        },
      ]),
    );
    expect(check(runChecks(flyer, [], {}), 'leftovers').severity).toBe('pass');
  });
});

// ---------------------------------------------------------------- norm

describe('norm', () => {
  it('survives punctuation and spacing drift between BigCommerce and the flyer', () => {
    expect(norm('Joan of Arc: The Girl Soldier')).toBe(norm('Joan of Arc - the girl soldier'));
    expect(norm('Pray by Sticker: Saints')).toBe('praybystickersaints');
  });
});
