/**
 * Render prisma/bot-knowledge.preview.json into a static, self-contained HTML
 * page at public/kb-preview.html — viewable at http://localhost:3000/kb-preview.html
 * with NO database writes. Regenerate after re-running the seed generator.
 */
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('prisma/bot-knowledge.preview.json', 'utf8'));
const AUD_ORDER = ['All', 'In-Person', 'Catholic School', 'Parish', 'Public', 'Virtual'];
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const byAud = {};
for (const e of data) (byAud[e.audience] ||= []).push(e);

const counts = AUD_ORDER.filter((a) => byAud[a])
  .map((a) => `${a}: ${byAud[a].length}`)
  .join(' · ');

const sourceTag = (s) =>
  s?.startsWith('pdf:') ? 'PDF FAQ' : s?.startsWith('FAQ') ? 'site FAQ' : s === 'authored' ? 'guide/authored' : s || '';

let sections = '';
for (const aud of AUD_ORDER) {
  const items = byAud[aud];
  if (!items) continue;
  const cards = items
    .map(
      (e) => `
    <article class="qa" data-aud="${esc(aud)}" data-text="${esc((e.question + ' ' + e.answer).toLowerCase())}">
      <div class="meta"><span class="cat">${esc(e.category || '')}</span><span class="src">${esc(sourceTag(e.source))}</span></div>
      <h3>${esc(e.question)}</h3>
      <p>${esc(e.answer).replace(/\n/g, '<br>')}</p>
    </article>`
    )
    .join('');
  sections += `
  <section data-aud="${esc(aud)}">
    <h2>${esc(aud)} <span class="n">${items.length}</span></h2>
    ${cards}
  </section>`;
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bot Knowledge Base — Preview (${data.length} entries)</title>
<style>
  :root { --navy:#02176f; --blue:#0088ff; --ink:#1a1b1f; --muted:#7e828f; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Arial, sans-serif; color: var(--ink); margin: 0; background:#f5f5f5; }
  header { position: sticky; top:0; background:#fff; border-bottom:1px solid #e3e3e8; padding:16px 22px; z-index:10; }
  h1 { color: var(--navy); margin:0 0 6px; font-size:20px; }
  .sub { color: var(--muted); font-size:13px; margin-bottom:12px; }
  .controls { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  input[type=search]{ flex:1; min-width:220px; padding:8px 12px; border:1px solid #dcdce2; border-radius:8px; font-size:14px; }
  .filters button { border:1px solid #dcdce2; background:#fff; color:var(--navy); padding:6px 12px; border-radius:999px; font-size:13px; cursor:pointer; }
  .filters button.active { background:var(--navy); color:#fff; border-color:var(--navy); }
  main { padding: 8px 22px 60px; max-width: 900px; margin:0 auto; }
  section h2 { color:var(--navy); border-bottom:2px solid var(--navy); padding-bottom:4px; margin-top:28px; }
  section h2 .n { color:var(--muted); font-size:14px; font-weight:400; }
  .qa { background:#fff; border:1px solid #e7e7ec; border-radius:10px; padding:14px 16px; margin:10px 0; }
  .qa h3 { margin:4px 0 6px; font-size:15px; color:var(--navy); }
  .qa p { margin:0; font-size:14px; line-height:1.55; }
  .meta { display:flex; gap:8px; }
  .cat,.src { font-size:11px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); }
  .src { color:var(--blue); }
  .hidden { display:none !important; }
</style></head><body>
<header>
  <h1>Ignatius Book Fairs — Bot Knowledge Base Preview</h1>
  <div class="sub">${data.length} proposed entries &nbsp;•&nbsp; ${counts} &nbsp;•&nbsp; DRY RUN (nothing written to the database)</div>
  <div class="controls">
    <input type="search" id="q" placeholder="Search questions & answers…">
    <div class="filters" id="filters">
      <button data-f="all" class="active">All audiences</button>
      ${AUD_ORDER.filter((a) => byAud[a]).map((a) => `<button data-f="${esc(a)}">${esc(a)}</button>`).join('')}
    </div>
  </div>
</header>
<main>${sections}</main>
<script>
  const q = document.getElementById('q');
  const filters = document.getElementById('filters');
  let aud = 'all';
  function apply() {
    const term = q.value.trim().toLowerCase();
    document.querySelectorAll('.qa').forEach(el => {
      const okAud = aud === 'all' || el.dataset.aud === aud;
      const okText = !term || el.dataset.text.includes(term);
      el.classList.toggle('hidden', !(okAud && okText));
    });
    document.querySelectorAll('section').forEach(s => {
      const any = s.querySelectorAll('.qa:not(.hidden)').length;
      s.classList.toggle('hidden', any === 0);
    });
  }
  q.addEventListener('input', apply);
  filters.addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    aud = e.target.dataset.f;
    [...filters.children].forEach(b => b.classList.toggle('active', b === e.target));
    apply();
  });
</script>
</body></html>`;

writeFileSync('public/kb-preview.html', html);
console.log(`Wrote public/kb-preview.html (${data.length} entries) — open http://localhost:3000/kb-preview.html`);
