# Ignatius Book Fairs

Next.js website for Ignatius Book Fairs -- a partnership between Ave Maria University and Ignatius Press.

**Production:** https://www.ignatiusbookfairs.com

## Tech Stack

- **Framework:** Next.js 16.1.3 with Turbopack, App Router, React Compiler
- **Language:** TypeScript 5
- **UI:** React 19.2.3
- **Styling:** Tailwind CSS v4 (PostCSS plugin)
- **Database:** PostgreSQL (Neon, pooled + unpooled connections)
- **ORM:** Prisma 5.22.0
- **Hosting:** Vercel
- **Fonts:** Adobe Typekit (Brother 1816, Handsome Pro), Google Fonts (Open Sans, Great Vibes)
- **Integrations:** HubSpot (CRM/forms/chat/meetings), Google Analytics, Wistia

## Local Dev Setup

```bash
npm install
npm run dev        # runs on port 3002 (not 3000)
```

Open http://localhost:3002

## Environment Variables

Two env files exist -- this is intentional:

| File | Purpose |
|------|---------|
| `.env` | Holds `DATABASE_URL="file:./dev.db"` (SQLite, **unused**). Created early and never removed. |
| `.env.local` | Real Neon PostgreSQL `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `HUBSPOT_ACCESS_TOKEN`, `VERCEL_OIDC_TOKEN`, `NEON_PROJECT_ID`. **This is the real config.** |

**Gotcha:** Prisma will silently pick up the SQLite URL from `.env` if you run scripts without explicitly passing `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://..." npx ts-node prisma/sync-resources.ts
```

The full Neon connection string is in `.env.local`.

## Database

### Models (Prisma)

| Model | Holds |
|-------|-------|
| `FAQ` | Q&A pairs with version tags (Public/Catholic/Both), pageTitle grouping, ordering |
| `Resource` | Downloadable PDFs/images/videos with category, audience, parentGuide relationship, hasDetails flag |
| `Blog` | Posts with rich HTML content, summary, thumbnail, category, featured/archived flags |
| `Testimonial` | Quotes filtered by type (Public/Catholic) |
| `FormFunnelEvent` | SignUp form analytics (sessionId, step events, org/state/rep) |

### Seeding

- **`prisma/sync-resources.ts`** is the source of truth for the Resource table. It **wipes and reseeds** on every run.
- Resource backups live in `prisma/backup-*.json` (snapshots before destructive ops).
- FAQ, Blog, Testimonial are managed via Prisma Studio or admin endpoints (see below).

To update resources:

```bash
# 1. Copy file to public/documents/
# 2. Edit prisma/sync-resources.ts
# 3. Sync DB:
DATABASE_URL="<neon-url-from-env-local>" npx ts-node prisma/sync-resources.ts
# 4. Commit both the file and the script together
```

## Deployment

| Branch | Behavior |
|--------|----------|
| `main` | Auto-deploys to production at `www.ignatiusbookfairs.com` |
| Any other branch | Creates Vercel preview URL (not production) |

**Rollback:** Vercel dashboard -> Deployments -> click any prior deployment -> "Promote to Production". Instant.

## Pages

| Route | Description | Notes |
|-------|-------------|-------|
| `/` | Home: hero, how it works, why host, video, testimonials, FAQs | `force-dynamic` |
| `/about` | Team members and founders | static |
| `/blog` | Blog listing with category filtering | `force-dynamic` |
| `/blog/[slug]` | Individual blog post with share buttons | `force-dynamic` |
| `/book-battles` | Private Wistia video page | `noindex, nofollow` |
| `/bookfair-resources` | Filterable resource gallery (PDFs, videos, images) | `force-dynamic` |
| `/fair?school=...` | Personalized fair landing with HubSpot lookup | `force-dynamic` |
| `/faqs` | FAQ accordion with Catholic/Public toggle | `force-dynamic` |
| `/guide/catholic-in-person` | Step-by-step Catholic in-person fair guide | static |
| `/press-room` | Press releases and media resources | static |
| `/resources` | Alias -- redirected to `/bookfair-resources` | `force-dynamic` |
| `/sales-resources` | Downloadable flyers and ads for sales reps | static |
| `/terms-of-service` | Legal terms | static |
| `/upload-tax-document` | HubSpot form embed for tax document upload | client component |

## API Routes

| Route | Method(s) | Purpose |
|-------|-----------|---------|
| `/api/analytics/track` | POST | Logs form funnel events to FormFunnelEvent table |
| `/api/blogs/[id]` | PATCH | Update blog category (requires `x-admin-key` header) |
| `/api/faqs/[id]` | GET, PATCH, DELETE | Fetch/update/delete FAQs (PATCH/DELETE require `x-admin-key`) |
| `/api/hubspot/lookup` | POST | Query HubSpot by domain -> company, deals, owner, booking URL |
| `/api/hubspot/submit` | POST | Submit multi-step form to HubSpot Forms API (contact + company) |
| `/api/hubspot/test-mode` | GET, POST | Toggle test mode (POST is dev-only) |
| `/api/school-logo` | GET | Resolve school logo via Clearbit then HTML scrape fallback |
| `/api/testimonials` | GET | Filtered testimonials by type |

## Auth / Admin

- **Admin tagging mode** for FAQs and Blogs: keyboard shortcut `Ctrl+Option+Shift+T` -> auth prompt
- **Hardcoded credentials:** username `ibfadmin`, password `ibf` (stored in `sessionStorage`)
- **API auth:** admin endpoints check header `x-admin-key: ibf-admin-2024`
- These are intentional client-side gates, not real security -- the data they edit isn't sensitive and the site is small enough that public knowledge of the password isn't a realistic threat

## Version Toggle (Catholic / Public)

Global context in `src/contexts/VersionContext.tsx`:

- **Keyboard shortcuts:** press `C` for Catholic, `P` for Public
- **URL override:** `?mode=p` or `?mode=c`
- **Persistence:** `localStorage` key `visibility`
- Many components conditionally render based on `isCatholic` / `isPublic`

## Project Structure

```
src/
  app/                Next.js App Router pages + API routes
    api/              Backend endpoints
    [route]/page.tsx  Individual page routes
  components/         React components (30 total)
  contexts/           VersionContext (Catholic/Public toggle)
  lib/                data.ts (Prisma queries), analytics.ts
prisma/
  schema.prisma       DB models
  sync-resources.ts   Resource table seed (wipes and reseeds)
  backup-*.json/.sql  DB snapshots
public/
  documents/          Static PDFs (140 files)
  images/             Site images (1,034 files)
scripts/
  generate_catalog_v2.py    Current IDML catalog generator
  generate_catalog.py       V1 IDML generator
  swap_book.py              Per-slot IDML swap
  enrich-books.ts           CSV enrichment via ISBNdb/OpenLibrary
  convert-to-bigcommerce.ts CSV -> BC import format
  patch-enriched.ts         Manual CSV patches
  add-catholic-testimonials.ts  Testimonial seed
```

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Dark blue / Navy | `#02176f` | Body text, headlines |
| Bright blue | `#0066ff` / `#0088ff` | Buttons, links |
| Orange | `#ff6445` | Operational accents, step labels |
| Green | `#00c853` / `#50db92` | Advertising accents, success states |
| Yellow | `#ffd41d` | Highlights |
| Light blue | `#f0f8ff` | Checkbox/card backgrounds |

## Common Gotchas

- **Dev server uses port 3002**, not 3000 (set in `package.json` `dev` script).
- **`.env` vs `.env.local`:** `.env` has an unused SQLite URL. Always pass `DATABASE_URL` explicitly to scripts or they'll silently misfire.
- **Prisma cache:** restart dev server after schema changes.
- **Next.js image cache:** to bust, rename the file (`logo.png` -> `logo-v2.png`). Clearing the cache doesn't work reliably.
- **Date parsing:** `new Date('2026-03-01')` parses as UTC midnight and shows as previous day in local time. Append `T12:00:00` to date-only strings.
- **`object-contain` with transparent PNGs:** subject appears tiny if there's lots of transparent padding. Crop with PIL `img.crop(img.getbbox())` before importing.
- **Vercel preview vs production:** pushing to `post-launch` or other branches creates previews, **not** production. Only `main` deploys to live site.
- **uBlock Origin:** blocks the HubSpot tracking script (`js.hs-scripts.com`). Doesn't affect site functionality but does prevent chat from loading. Test in incognito to rule out.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server on port 3002 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start built production server |
| `npm run lint` | ESLint |
| `npm run postinstall` | Runs `prisma generate` automatically |

Python scripts (run with `python3`):

| Script | Purpose |
|--------|---------|
| `scripts/generate_catalog_v2.py` | Generate Summer Catalog IDML from BC CSV (current) |
| `scripts/generate_catalog.py` | V1 IDML generator (legacy) |
| `scripts/swap_book.py` | Per-slot IDML book swap (testing) |

**Full process guide:** [`IDML-FROM-BIGCOMMERCE.md`](IDML-FROM-BIGCOMMERCE.md) — how we
repopulate a designer-built flyer's sections (covers, prices, titles, AR badges, and
store hyperlinks) from a BigCommerce category export. Includes the SKU-join rule, the
center-fit cover math, AR-field detection, and the string-edit/repack gotchas.

## Difficulties Encountered & Solutions

### IDML Catalog: Apple Preview hyperlinks didn't work
**Symptom:** Clickable book links in exported PDF worked in Acrobat but did nothing in Apple Preview (15% of users).
**Root cause:** IDML book slots were `Button` elements with `GotoURLBehavior` actions. Acrobat understands button actions; Preview only handles standard PDF link annotations.
**Solution:** Two changes in `scripts/generate_catalog_v2.py`:
1. Convert all `Button` elements to plain `Group` elements (strip Button/State wrappers, keep content) so Print PDF export shows the images.
2. Add `Hyperlink` + `HyperlinkPageItemSource` + `HyperlinkURLDestination` elements to `designmap.xml` with `Visible="false"` and `Width="None"` (no borders).
3. Export from InDesign as **Print PDF** with **Hyperlinks** checkbox checked (not Interactive PDF).
This produces standard PDF link annotations that work in both viewers.

### IDML XML editing: stripped processing instructions and shifted positions
**Symptom:** Repacked IDML files wouldn't open, or page layouts shifted on opening.
**Root cause:** Python's `xml.etree.ElementTree` strips `<?aid?>` processing instructions and rewrites attribute order. The attribute order matters in IDML spread XMLs because some elements rely on positional parsing in InDesign.
**Solution:**
- Use ElementTree only for **story XMLs** (text content, no positioning).
- Use **string replacement** for spread XMLs (preserves positions).
- Use **string manipulation** for `designmap.xml` (preserves the `<?aid?>` PI).

### IDML AR badge regex was eating valid slot content
**Symptom:** Some book slots (specifically Winning Reads B2/B3) rendered empty after generation.
**Root cause:** The regex removing unnamed groups containing navy ovals (`Name="$ID/...`) was greedily matching State groups inside Buttons that had `Name="$ID/$$$/StateType/Normal"`.
**Solution:** Tighten the regex to match only truly unnamed groups (`Name="\$ID/"`) not the broader pattern.

### Resource not appearing on production site
**Symptom:** New resource added to `sync-resources.ts`, synced to DB, pushed to `post-launch` branch. Resource visible on preview deployment but never on production.
**Root cause:** `post-launch` branch only deploys to preview URLs. Production deploys only from `main`. Several rounds of "it's not showing up" were because `main` was several commits behind `post-launch`.
**Solution:** Always merge `post-launch` (or feature branches) into `main` to deploy to production. Verify on the actual production domain, not the preview URL.

### BigCommerce CSV format change broke AR detection
**Symptom:** Script using "Custom Field" item rows to find AR-tagged products found zero AR products in newer CSV exports.
**Root cause:** BigCommerce changed CSV export format. Custom Fields are now a single JSON column on the Product row, not separate Item rows.
**Solution:** Parse `Custom Fields` column as JSON: `[{"id":..., "name":"AR", "value":"AR"}, ...]`.

### Fairytales Subgroup -- shared text frame across 3 book images
**Symptom:** Subgroup of 3 overlapping book covers shares one text description block, but script treated each rectangle as needing its own title/price.
**Root cause:** Special IDML structure: a "Subgroup" containing 3 `Rectangle` elements (images) plus a separate `Group` containing one shared `TextFrame`. Standard slot detection doesn't handle this.
**Solution:** In `generate_catalog_v2.py`, detect `Subgroup`-named groups specially. Assign 3 products to the 3 rectangles. Build the shared text frame as a combined story listing all 3 products' title/price pairs sequentially. Added `combined_book_nums` field to `SlotInfo` for this case.

### Text frame too short -- prices clipped
**Symptom:** Two slots in Timeless Classics rendered title but not price. Stories had correct content; just visually missing.
**Root cause:** Text frames were sized for 2 lines of text. Long titles wrapped to 3 lines, pushing the price line outside the frame's bottom edge. Vertical justification was "Top" so it wasn't a center-clip issue -- the frame was just too short.
**Solution (manual, in InDesign):** Either drag the bottom handle to add height, or **Object -> Text Frame Options -> Auto-Size tab -> "Height Only" with top-center reference point** so frames grow downward to fit content.

### BC product sort order vs catalog visual order
**Symptom:** Products in BC sorted in one order, but the catalog needed a specific 3 products in the Fairytales Subgroup section.
**Solution:** Added `PRODUCT_ORDER_OVERRIDES` dict at the top of `generate_catalog_v2.py`. Maps section name -> ordered list of SKUs. Overrides BC Sort Order when specific positioning matters (e.g., bundled slots). SKUs not in the override fall back to BC Sort Order.

## External Resources

- **Production site:** https://www.ignatiusbookfairs.com
- **Store (separate Next.js app):** https://store.ignatiusbookfairs.com
- **Phone:** 888-771-2321

A partnership between **Ave Maria University** and **Ignatius Press**.
