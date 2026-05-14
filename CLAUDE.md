# Claude / AI Tool Notes

**Read `README.md` first.** It has tech stack, env vars, scripts, deployment, pages, API routes, brand colors, gotchas, and a "Difficulties Encountered" section documenting hard-won fixes.

This file adds AI-tool-specific guidance on top of that.

## Working Style

- **No emojis** in any output, code, comments, or generated files. Use inline SVG icons.
- Match existing component patterns: Tailwind classes, `brother-1816` font for headlines, brand colors from README.
- **No premature abstractions.** Three similar lines is better than a generic helper for two callers.
- **No speculative error handling.** Don't validate at internal boundaries; trust the framework. Validate at user input and external API boundaries.
- **Prefer editing existing files** over creating new ones.
- For UI changes: start the dev server (`npm run dev`, port 3002), open in browser, verify the change actually rendered before reporting done.

## Deployment Discipline

- **Push to `main` deploys to production immediately.** Confirm with the user before pushing changes that affect the public site.
- **Pushes to other branches create Vercel previews only**, not production.
- Don't merge `post-launch` (or any branch) into `main` without explicit user confirmation.
- Vercel has instant rollback if something breaks -- mention this if a push goes wrong.

## Database Safety

- Always pass `DATABASE_URL` **explicitly** when running Prisma scripts. The `.env` file has an unused SQLite URL that will silently misfire if you rely on default loading.
- Get the real URL from `.env.local` (Neon PostgreSQL).
- Before destructive ops on the Resource table (which `sync-resources.ts` wipes and reseeds), back up first:
  ```bash
  DATABASE_URL="..." node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.resource.findMany().then(r=>require('fs').writeFileSync('prisma/backup-YYYY-MM-DD.json',JSON.stringify(r,null,2)));"
  ```

## Files to Treat With Care

- **`prisma/sync-resources.ts`** -- editing this rewrites the entire Resource table on next sync. Verify changes against current production data first.
- **`next.config.ts`** -- redirects are `permanent: true` (301). Wrong destinations get cached aggressively by browsers.
- **`src/app/layout.tsx`** -- root layout. Breaking this breaks every page.
- **`src/components/SignUpForm.tsx`** -- 1500+ lines, central to lead capture. Has hardcoded rep territory mappings and HubSpot meeting URLs.
- **`scripts/generate_catalog_v2.py`** -- has hard-won constraints documented in the README's "Difficulties Encountered" section. Don't undo:
  - Books must be Groups, not Buttons (Print PDF compatibility)
  - PDF hyperlinks via `Hyperlink` elements, not `GotoURLBehavior` (Apple Preview compatibility)
  - String replacement for spread XMLs (positions matter)
  - ElementTree only for story XMLs
  - String manipulation only for `designmap.xml` (preserves `<?aid?>` PI)

## Common User Asks and Standard Workflow

| User asks | Standard workflow |
|-----------|-------------------|
| "Add resource X" | (1) Copy file to `public/documents/`. (2) Edit `prisma/sync-resources.ts`. (3) Run sync with explicit `DATABASE_URL`. (4) Commit file + script together. (5) Push to `main` (confirm first). |
| "Update FAQ pdf for X coordinator" | Same as above -- the FAQ pdfs are Resource records, not FAQ records. The FAQ table is for the on-site accordion FAQ. |
| "Redirect /old to /new" | Edit `next.config.ts` redirects array. Use `permanent: true` for 301s. Push to `main`. |
| "Generate catalog" | Run `scripts/generate_catalog_v2.py` with dated output filename (e.g. `sneak-peek-GENERATED-MM-DD.idml`). Pass `--idml`, `--csv`, `--output`. |
| "Add a new page" | New directory under `src/app/`, add `page.tsx`, follow existing pattern. Don't forget the `metadata` export. Use `force-dynamic` if it reads from Prisma. |
| "Fix the resources filter" | Look at `src/components/ResourcesPageContent.tsx` -- the filter logic is in `applyFilter`. The page data comes from `getResources()` in `src/lib/data.ts`. |
| "Is X live yet?" | Check production URL with `curl`, not the preview URL. Verify the resource is in the actual Neon DB, not just the local sync script. |

## Verification Habits

Before reporting "done" on production-visible work:

1. Build passes: `npm run build`
2. (For UI) Browser check on `localhost:3002`
3. (For DB changes) Confirm row exists by querying Neon directly
4. (For deploy) `curl -sL https://www.ignatiusbookfairs.com/<path> | grep <expected>` after Vercel finishes deploying

## When in Doubt

- If a user says "it's not showing up," check **which URL** they're testing (production vs preview vs localhost) before changing code.
- If a Prisma script seems to have done nothing, check **which DATABASE_URL** it actually used.
- If a hyperlink/button isn't working in a PDF, check **which export format** they used (Print PDF vs Interactive PDF -- they have opposite compatibility properties).
- If the dev server "won't start," port 3002 is probably already in use: `lsof -ti:3002 | xargs kill -9`
