# Social Posts, Training & Article Generator — Handoff

_Last updated: July 23, 2026. Covers the work on the Social Studio, the brand
Training area, and the AI article generator._

## Training (`/admin/training`)

One admin page that teaches the AI tools the brand. Everything here is injected
into the blog + social generators as a "brand brief" (`brandBrief()` in
`src/lib/training.ts`) — only non-empty sections are included.

### Audiences (Brand voice & preferences)
Per audience (Parents / Teachers / Administrators + add your own):

- **Persona** — who they are (tall free-text field).
- **Pain points** — one per line (tall free-text field).
- **Statements & angles** — ONE combined bucket (the old separate "angles" list
  was merged in; legacy data folds in automatically on read). Edited entirely
  as pills:
  - **★ star** a pill = "I like this" → weighted heavily in generation (listed
    first in the brief, marked as team favorites, used as style exemplars when
    generating more).
  - **✕** removes, **click the text** edits in place (Enter saves, Esc cancels),
    **dashed pill** at the end adds (type + Enter).
- **✨ Generate with AI** buttons:
  - On Persona → bullets in, vivid persona + 4–6 pain points out.
  - On Statements & angles → optional bullets (works from persona/pain points
    alone), **"How many?" slider 5–50**, produces a mix of punchy declaratives
    and content directions. Starred favorites + uploaded brand docs steer it.
  - **Click-to-prefill**: focusing an empty statements box auto-crafts 5+ from
    the persona/pain points.
- API: `/api/admin/training/craft` (kinds: `statements`, `persona`, `angles`).

### Image library
Tagged brand photos (Vercel Blob or URL). Photo-hero social posts and reels
pull real backgrounds from here. **Multi-file upload supported.**

### Document library
Brand documents (PDF/Word/PowerPoint/text, 25 MB, multi-upload, or add by URL).
**The `kind` matters** — text is extracted on add (`unpdf` for PDFs) and stored
on the row, then injected into generation:

- `design-language` → "DESIGN LANGUAGE REFERENCE — follow this visual & verbal
  identity" (social + blog + craft helper)
- `angles` → "MESSAGING & ANGLE REFERENCE — draw angles, phrasing, emphasis"
- `other` → generic reference block

Docs added **before** July 23 have no extracted text — re-add them to parse.

## Social Studio (`/admin/social`)

Sources: **a blog post** (brings its featured books), **campaign strategy**
(no blog), or **pasted content**. Generation: `src/lib/social/generate.ts`
(Claude Opus 4.8, structured outputs) → rendered by the design-system OG
renderer (`/api/og/post`, themes: statement / stat / checklist / steps / quote /
photo-hero / book-grid / book-slide).

### Books → graphics
When the source blog has featured books (BigCommerce covers):
- ~half the set are **book posts** with real cover art.
- **book-grid** — covers in a row on one square graphic.
- **book-carousel** — NEW: when there are **2+ books**, one post is a vertical
  (9:16) swipeable carousel: hook slide + one slide per book (big cover, title,
  an AI-written selling line per book). Badge "Carousel · N slides", per-slide
  PNG downloads. **Guaranteed**: if the model doesn't return one, a book-grid
  post is converted (client fallback in `DesignedPosts.tsx`).
- Carousels never get photo/video backgrounds (that bug hid them as "Motion
  reels" — fixed in `a2c6d99`).

### Other post features
- **photo-hero** posts + all normal reels get real brand photos (round-robin
  from the Training image library); ONE reel per set becomes a motion-clip
  video reel; reels download as real MP4s (rendered in-browser).
- **Tweak tool** per post: colors, background photo/video swap.
- **Save** (green button) — NEW: persists the post server-side **attached to its
  parent concept** (blog title / campaign name). Reopening that concept shows
  its saved posts (re-rendered, downloadable, deletable).
  Model: `SavedSocialPost`; API: `/api/admin/social/saved`.

## Article generator (`/admin/blog`)

`generateArticle()` in `src/lib/claude.ts` — Claude Opus 4.8, adaptive
thinking, structured outputs (title / summary / category / contentHtml).
Inputs: topic, category, audience, bullet points, featured books (BigCommerce).
The brand brief (audiences with persona/pain points/starred statements, brand
docs, colors, fonts, article prefs) is injected into the system prompt. A
deterministic Featured Books gallery (real covers + shop links) is appended
after the AI content. Blog promo kits + newsletter suggestions live in the same
file.

## Data / infrastructure notes

- DB is the **production Neon Postgres** (`.env.local`), including from local
  dev. Schema changes: edit `prisma/schema.prisma`, then
  `set -a && . ./.env.local && set +a && npx prisma db push` (+ restart local
  dev so the regenerated Prisma client is loaded — a stale client caused a
  crash on July 23).
- New tables added in this work: `TrainingDocument` (with extracted `text`),
  `SavedSocialPost`. `TrainingProfile.audiences` JSON gained `persona`,
  `painPoints`, `starredStatements` (all backward compatible on read).
- Uploads use Vercel Blob (OIDC on prod). Local uploads need
  `BLOB_READ_WRITE_TOKEN` in `.env.local` (token is "sensitive" in Vercel — copy
  it from the dashboard, it can't be pulled by CLI).
- Local admin: `http://localhost:3002/admin/dev-login?next=/admin/...`
  (404s in production).

## Next up (discussed, not built)

- **Auto-post to Meta**: feasible without App Review for IBF's own Page/IG.
  One-time: Business app + system-user token with `pages_manage_posts`,
  `instagram_basic`, `instagram_content_publish`. Then: FB photo post = 1 call;
  IG = container → publish (**JPEG only** — convert PNGs); carousel = item
  containers + CAROUSEL container; reels = video container + poll. The saved
  posts + carousel slides are already in the right shape for this.
