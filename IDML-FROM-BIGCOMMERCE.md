# Repopulating an InDesign IDML Flyer from BigCommerce

How we rebuild a print flyer's book slots (covers, titles, prices, AR badges,
and store hyperlinks) from a BigCommerce product export. This is the
**section-repopulation** workflow — swapping each flyer *section* to hold the
products of its BigCommerce *subcategory*. It is a companion to
`scripts/generate_catalog_v2.py` (which generates a catalog from scratch) and
`scripts/swap_book.py` (per-slot swaps); this doc is the field guide for the
**edit-in-place** job on a designer-built flyer.

> Read alongside README.md → "Difficulties Encountered" and the memory notes.
> The hard-won rules here are not optional — skipping them corrupts the file.

---

## 0. TL;DR / order of operations

1. **Back up** the source `.idml` before touching anything.
2. Get the BigCommerce **category export CSV** and the **subcategory IDs** (see §2).
3. Extract the IDML (it's a zip) to a working dir.
4. **Map** each flyer section → its subcategory, and each grid slot → a product,
   **joining on the cover-filename SKU** — never on title (§3, §4).
5. For each slot: update **story** (title + price), **cover** (download + relink
   + center-fit transform), **AR badge** (show/hide), and the **hyperlink**.
6. Rename any section headers as requested.
7. **Repack mimetype-first** and verify (§8).

**The golden rule: join by SKU, edit spreads/designmap by string replacement,
repack mimetype-first, verify everything.**

---

## 1. The BigCommerce export CSV

A "Products" export (~50 columns). Each product is one `Item="Product"` row
followed by `Item="Image"` sub-rows.

Columns we use:

| Column | Use |
|---|---|
| `Item` | `Product` vs `Image` (cover sub-rows) |
| `SKU` | e.g. `IBC.1367` — **the join key** |
| `Name` | product title |
| `Price` | display price |
| `Categories` | semicolon-separated category **IDs** (no names in the export) |
| `Custom Fields` | JSON array — holds the **`AR`** field (see §5) |
| `Product URL` | e.g. `/a-foal-called-storm.../` — for hyperlinks |
| `Image URL (Import)` / `Internal Image URL (Export)` | cover CDN URL (on the `Image` sub-rows; prefer the thumbnail) |

Parse robustly (BigCommerce uses `utf-8-sig`):

```python
import csv, json
rows = list(csv.reader(open(CSV, newline='', encoding='utf-8-sig')))
H = rows[0]; idx = {c: i for i, c in enumerate(H)}
def g(r, c): i = idx.get(c); return r[i] if i is not None and i < len(r) else ''
products = [r for r in rows[1:] if g(r, 'Item') == 'Product']
```

---

## 2. Categories & subcategories

- The **parent** category (e.g. "Public Back to School") often has **0 products
  tagged directly** — products live in its **subcategories**.
- Products are tagged with **many overlapping** grade/age/topic categories, so
  you **cannot reliably auto-detect** which ID is "Graphic Novels" vs "Middle
  School." **Get the subcategory IDs by filtering in the BigCommerce admin**
  ("Category is Elementary" → note the product count, and confirm the shared ID).
- Example mapping from one Back-to-School flyer:
  - Elementary = cat **465** (11 products)
  - Middle School = cat **462** (7)
  - Graphic Novels = cat **463** (5)
  - Picture Books = cat **464** (6)
- Detect AR correctly (see §5) — a product's grade categories are irrelevant to AR.

Get a subcategory's products:

```python
elem = [r for r in products if '465' in g(r, 'Categories').split(';')]
```

---

## 3. The join key: cover filename = SKU (NEVER title)

Each cover image in the flyer is named **`IBC.<sku>.jpg`** (e.g. `IBC.1367.jpg`),
and that is exactly the product **SKU** in the CSV. So:

```
flyer cover  IBC.1367.jpg   →   SKU IBC.1367   →   CSV product row
```

**Do not join by title.** Titles collide: the flyer's "Joan of Arc" is
`IBC.6JAH` (Josephine Poole edition, $16.99, AR), but a title match grabs a
*different* "Joan of Arc" ($18.95, no AR) → a false "price change" and wrong
data. Football Genius / Dinosaur Dinners have the same trap. Cover SKU is
unambiguous.

---

## 4. IDML anatomy & the section→slot mapping

An IDML is a **zip** with (among others):

- `mimetype` — must be **stored first, uncompressed** on repack.
- `designmap.xml` — top-level map + **all hyperlinks** (and the `<?aid?>` PI).
- `Stories/Story_*.xml` — text (each book = one story: title + price, **no SKU**).
- `Spreads/Spread_*.xml` — page geometry: frames, images, groups, badges.

### A book "slot" (leaf group)

Each book is a `<Group>` containing:
- a `<Rectangle>` (the cover frame) with an `<Image>` inside (the cover),
- a nested `<Group>` = the **AR badge** (an `Oval` + a `<TextFrame>` whose story
  is just `AR`),
- a `<TextFrame>` whose `ParentStory` is the **title/price** story.

### Sections are NOT structural groups

The section header ("Elementary Excitement!") and its book slots are **not
grouped together** — they're just positioned near each other. So map slots to
sections by **page + Y position**, and **exclude pasteboard standalones**
(items parked far off-page, e.g. absolute `x < -400`). Accumulate `ItemTransform`
translations up the parent chain to get a slot's absolute position.

Verify the slot counts per section match the subcategory product counts before
editing anything (e.g. 6 / 7 / 5 / 11 = 29 grid slots ↔ 29 products).

---

## 5. AR badges (the "Accelerated Reader" trap)

- **AR = a custom field whose `name` or `value` is exactly `"AR"`.** It is
  **NOT** `Badge="Accelerated Reader"` — that's a different field and using it
  hides/shows the wrong books.

```python
def is_ar(r):
    cf = json.loads(g(r, 'Custom Fields') or '[]')
    return any(str(x.get('name','')).strip() == 'AR' or
               str(x.get('value','')).strip() == 'AR' for x in cf)
```

- A badge is hidden/shown by the **`Visible="true"|false"` attribute on the badge
  `<Group>`**.
- Find a badge group by a **direct-child** `<TextFrame>` whose story content is
  exactly `AR`. Use **direct children only** — iterating all descendants
  matches outer/section groups and mis-toggles whole books.
- A few badges may be **floating** (not inside a book group). Resolve those by
  nearest-slot **position match**, or hide stray/duplicate ones.

---

## 6. Swapping a cover (the center-fit transform)

The cover `<Image>` lives inside a `<Rectangle>` frame. To place a new cover:

1. **Download** the CSV cover URL; read pixel size `W×H` (PIL). Images are treated
   at **72 ppi**, so 1 px = 1 pt.
2. **Frame bounds** `(x0, y0, fW, fH)` come from the Rectangle's
   `<PathPointType Anchor="x y">` corners (min/max).
3. **FillProportionally, centered:**

   ```
   s  = max(fW / W, fH / H)
   tx = x0 + (fW - s*W) / 2
   ty = y0 + (fH - s*H) / 2
   ```

4. On the `<Image>` set:
   - `ItemTransform="s 0 0 s tx ty"`
   - `<GraphicBounds Left="0" Top="0" Right="W" Bottom="H" />`
   - `EffectivePpi="round(72/s) round(72/s)"`
   - the `<Link>` `LinkResourceURI="file:<quoted absolute path>"`

Download covers into a **local Links folder** (e.g.
`~/Downloads/BTS-PUBLIC-2026-Links/`) and point the URIs there — same-origin,
no missing links when the designer opens the file. URI format matches InDesign's
`file:/Users/...` (single slash, `%20`-encoded spaces).

Verified example: frame 88.01×120.2 pt, image 301×450 px → `s=0.2924`, image is
width-driven and cropped top/bottom, `ty` shifts up by `(fH − s·H)/2`.

---

## 7. Titles, prices, and hyperlinks

### Story (title + price, no SKU)

A book story's `ParagraphStyleRange` has character-style ranges: a small spacer
(`<Br/>`), the **title** (`<Content>…</Content>`), then the **price**
(`<Content>$X.XX</Content>`). Update the first non-`$` `<Content>` (title) and
the `$` one (price). No SKU is shown on this flyer.

- **XML-escape** titles (`& < >`).
- **Long titles overflow** the fixed frames — the layout tolerates ~50–60 chars
  (originals had 48–59), but trim anything egregious (e.g. a 96-char subtitle
  chain) and fix stray double-spaces.

### Hyperlinks (in `designmap.xml`)

Three linked pieces, all in `designmap.xml`:

```
<HyperlinkURLDestination Self="HyperlinkURLDestination/https%3a//store.../slug/?src=b2s"
    Name="https://store.../slug/?src=b2s"
    DestinationURL="https://store.../slug/?src=b2s"
    Hidden="false" DestinationUniqueKey="N" />
<HyperlinkPageItemSource Self="uXXX" SourcePageItem="<cover Rectangle Self>" />
<Hyperlink Self="uYYY" Source="uXXX" ...>
  <Properties><Destination type="object">HyperlinkURLDestination/https%3a//store.../slug/?src=b2s</Destination></Properties>
</Hyperlink>
```

- URL encoding: only the colon after `https` is encoded — `https://` → `https%3a//`.
  `/` and `?src=b2s` stay literal.
- **Map by SKU, not title:** `Hyperlink.Source` → `HyperlinkPageItemSource.SourcePageItem`
  (the cover Rectangle) → the Rectangle's `<Image>` `LinkResourceURI` → `IBC.<sku>`
  → CSV `Product URL`. Store URL = `https://store.ignatiusbookfairs.com` + ProductURL + `?src=b2s`.
- **This flyer uses `Hyperlink`/`HyperlinkURLDestination` elements, not
  `GotoURLBehavior`** (Apple Preview compatibility — see README).

---

## 8. Editing rules & gotchas (do not skip)

- **Back up first.** Keep the original `.idml`.
- **Stories:** ElementTree or targeted string replace is fine.
- **Spreads:** edit by **targeted string replacement** (locate elements by
  `Self=` with ElementTree read-only, then string-replace attrs). Do **not**
  ET-rewrite a whole spread — attribute order / structure matters.
- **`designmap.xml`:** **string replacement only** — ET rewriting drops the
  `<?aid?>` processing instruction and breaks the file.
- **Never block-delete across element types.** A regression we hit: replacing
  "everything from the first `<HyperlinkURLDestination>` to the first
  `<Hyperlink>`" **deleted the `HyperlinkPageItemSource` elements** in between →
  every link lost its source → **all links dead.** Replace *only* the elements
  you mean to (match the contiguous run of that one element type), or edit
  in place.
- **Never do a global URL `str.replace` across all links.** If one book's *old*
  slug equals another book's *new* slug (e.g. `football-genius`,
  `dk-super-readers-dinosaur-dinners`), sequential replaces **cross-contaminate**
  and merge two books onto one destination. Fix **surgically** (add a new
  destination + repoint only the affected `<Hyperlink>` by its `Self`), or use a
  two-pass placeholder. Keep `DestinationUniqueKey` consistent.
- **Standalone / pasteboard books** (far off-page) are not in any section grid —
  **leave them untouched.**
- **Verify store URLs resolve.** Follow the `308` canonical redirect to the final
  code; a `404` after redirect means the product page is **unpublished / stale
  slug** — that's a data issue to flag, not a link-target bug (e.g. a Dr Seuss
  title 404'd while the other 28 were fine).

### Repack (mimetype must be first, stored)

```bash
cd <workdir>
rm -f out.idml
zip -q -X out.idml mimetype          # stored, first entry
zip -q -rX out.idml . -x mimetype    # everything else
```

Confirm: `zipfile.ZipFile(out).namelist()[0] == 'mimetype'`.

---

## 9. Verification checklist (before handing back)

- [ ] All spreads + stories + `designmap.xml` parse as valid XML.
- [ ] `<?aid?>` PI is still the second line of `designmap.xml`.
- [ ] Every cover `LinkResourceURI` points to an existing local file; extensions match.
- [ ] Per-slot title/price match the joined product (by SKU).
- [ ] AR badge counts match the products' true `AR` field (show vs hide).
- [ ] Hyperlinks: 0 dangling `Destination` refs, 0 SKU mismatches; source-linkage
      (`HyperlinkPageItemSource`) count **unchanged** from the original.
- [ ] All product URLs resolve to 200 after redirects (flag any 404s).
- [ ] Repacked mimetype-first, correct file count.
- [ ] Open in InDesign: links resolve, covers fit, no overset title frames.

---

## 10. Tooling

- Python 3 + **PIL/Pillow** (image dimensions).
- `scripts/swap_book.py` — per-slot swap helpers (CSV parse, image download,
  link/transform updates). Note: it assumes `Button`-based slots; designer flyers
  using plain `Image`-in-`Rectangle` groups need the transform/relink logic here.
- `scripts/generate_catalog_v2.py` — full catalog generation from a BC CSV
  (different job: build from scratch vs. repopulate an existing layout).
