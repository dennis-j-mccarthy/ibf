// Renders a merged template as a designed, on-brand letter.
//
// Two modes, because the destinations have opposite constraints:
//   'page'  - screen preview and print/PDF. Full design: blob-masked hero
//             photo, script overlay, scattered doodads, brand fonts.
//   'email'  - pasted into Gmail/Outlook. Nested presentation tables, inline
//             styles, web-safe fonts, no masks or absolute positioning, since
//             Outlook renders with Word and drops all of it.
//
// Both come from the same content so the wording can never drift.

import { toHtml } from './format';

const C = {
  darkBlue: '#02176f',
  blue: '#0088ff',
  orange: '#f29500',
  coral: '#ff6445',
  yellow: '#ffd41d',
  green: '#50db92',
  mint: '#b9dbc5',
  ink: '#1a1b1f',
  slate: '#7e828f',
};

// Organic image container from the brand system. Radii stay in the 26-46%
// range on purpose: pushing them toward 50% collapses the shape into a plain
// ellipse and crops the subject's face out of the photo.
const BLOB = '34% 46% 30% 42% / 44% 32% 48% 36%';
const BLOB_ALT = '44% 30% 46% 34% / 34% 46% 32% 44%';

export interface LetterContent {
  name: string;
  subject: string;
  body: string;
  heroImage: string;
  heroScript: string;
  footerImage: string;
}

const abs = (origin: string, path: string) =>
  !path ? '' : path.startsWith('http') ? path : `${origin}${path}`;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Doodads are drawn inline rather than loaded as assets: the brand doodad PNGs
// are white, which is invisible on a white letter, and inline SVG prints
// crisply at any size.
const DOODADS: Record<string, string> = {
  slashes: `<svg width="64" height="56" viewBox="0 0 64 56" fill="none"><g stroke="${C.yellow}" stroke-width="9" stroke-linecap="round"><path d="M12 46L26 10"/><path d="M30 46L44 10"/><path d="M48 46L62 10"/></g></svg>`,
  squiggle: `<svg width="96" height="60" viewBox="0 0 96 60" fill="none"><path d="M4 22c10-16 20 12 30-2s20 12 30-2 20 10 28 2" stroke="${C.blue}" stroke-width="7" stroke-linecap="round"/><path d="M6 42c10-16 20 12 30-2s20 12 30-2 18 10 26 2" stroke="${C.darkBlue}" stroke-width="7" stroke-linecap="round"/></svg>`,
  triangle: `<svg width="72" height="66" viewBox="0 0 72 66" fill="none"><path d="M36 6L66 58H6z" stroke="${C.green}" stroke-width="7" stroke-linejoin="round"/></svg>`,
  loop: `<svg width="76" height="60" viewBox="0 0 76 60" fill="none"><path d="M8 40c22 18 44-4 30-20-10-11-22 4-12 14 12 12 30 10 42-6" stroke="${C.mint}" stroke-width="7" stroke-linecap="round"/></svg>`,
};

// ---------- Mode: page (screen + print) ----------

function pageLetter(c: LetterContent, origin: string): string {
  const hero = abs(origin, c.heroImage);
  const foot = abs(origin, c.footerImage);
  return `<div class="ibfL">
  <div class="ibfL-top">
    <img class="ibfL-logo" src="${abs(origin, '/images/ibf-logo-blue.png')}" alt="Ignatius Book Fairs" />
  </div>

  ${
    hero
      ? `<div class="ibfL-hero">
    <img src="${esc(hero)}" alt="" />
    ${c.heroScript ? `<span class="ibfL-script">${esc(c.heroScript)}</span>` : ''}
    <span class="ibfL-d ibfL-d1">${DOODADS.slashes}</span>
    <span class="ibfL-d ibfL-d2">${DOODADS.squiggle}</span>
    <span class="ibfL-d ibfL-d3">${DOODADS.loop}</span>
  </div>`
      : ''
  }

  ${c.subject ? `<h1 class="ibfL-h1">${esc(c.subject)}</h1>` : ''}
  <div class="ibfL-body">${toHtml(c.body)}</div>

  ${
    foot
      ? `<div class="ibfL-foot">
    <div class="ibfL-lockup">
      <span class="ibfL-foot-script">See you at the</span>
      <span class="ibfL-foot-big">BOOK FAIR</span>
    </div>
    <div class="ibfL-foot-img"><img src="${esc(foot)}" alt="" />
      <span class="ibfL-d ibfL-d4">${DOODADS.triangle}</span>
    </div>
  </div>`
      : ''
  }
</div>`;
}

// Scoped so it can be injected into the dashboard page as well as a print doc.
export function letterCss(origin: string): string {
  return `
@font-face { font-family: 'IBFDisplay'; src: url('${origin}/fonts/fredoka-700.ttf') format('truetype'); font-weight: 700; font-display: swap; }
@font-face { font-family: 'IBFDisplay'; src: url('${origin}/fonts/fredoka-500.ttf') format('truetype'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'IBFScript'; src: url('${origin}/fonts/caveat-700.ttf') format('truetype'); font-weight: 700; font-display: swap; }

.ibfL { max-width: 660px; margin: 0 auto; color: ${C.ink};
        font: 15px/1.62 'Helvetica Neue', Arial, Helvetica, sans-serif; }
.ibfL-top { margin-bottom: 18px; }
.ibfL-logo { display: block; width: 208px; height: auto; border: 0; }

.ibfL-hero { position: relative; margin: 0 0 30px; padding: 8px 0 14px; }
.ibfL-hero > img { display: block; width: 100%; height: 236px; object-fit: cover;
                   border-radius: ${BLOB};
                   box-shadow: 0 0 0 7px rgba(242,149,0,.16), 0 14px 34px -14px rgba(242,149,0,.5); }
.ibfL-script { position: absolute; top: 34px; left: 58px; transform: rotate(-6deg);
               font-family: 'IBFScript', 'Segoe Script', cursive; font-weight: 700;
               font-size: 42px; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,.5); }
.ibfL-d { position: absolute; line-height: 0; }
.ibfL-d1 { top: -2px; right: 54px; }
.ibfL-d2 { bottom: 6px; left: -26px; }
.ibfL-d3 { bottom: 22px; right: -18px; }
.ibfL-d4 { top: -28px; left: -38px; }

.ibfL-h1 { font-family: 'IBFDisplay', Arial, sans-serif; font-weight: 700; font-size: 25px;
           line-height: 1.22; color: ${C.darkBlue}; margin: 0 0 16px; letter-spacing: -.2px; }
.ibfL-body p { margin: 0 0 .95em; }
.ibfL-body h3 { font-family: 'IBFDisplay', Arial, sans-serif; font-weight: 700; font-size: 16px;
                color: ${C.darkBlue}; margin: 1.5em 0 .5em; }
.ibfL-body strong { color: ${C.darkBlue}; }
.ibfL-body ul { margin: 0 0 1em; padding-left: 0; list-style: none; }
.ibfL-body li { position: relative; padding-left: 20px; margin: .38em 0; }
.ibfL-body li::before { content: ''; position: absolute; left: 2px; top: .62em;
                        width: 7px; height: 7px; border-radius: 50%; background: ${C.orange}; }
.ibfL-body a { color: ${C.blue}; text-decoration: none; font-weight: 600; }

.ibfL-foot { position: relative; display: flex; align-items: center; gap: 18px;
             margin: 34px 0 0; padding-top: 8px; }
.ibfL-lockup { flex: 1; }
.ibfL-foot-script { display: block; font-family: 'IBFScript', 'Segoe Script', cursive;
                    font-weight: 700; font-size: 27px; color: ${C.mint}; margin-left: 8px; }
.ibfL-foot-big { display: block; font-family: 'IBFDisplay', Arial, sans-serif; font-weight: 700;
                 font-size: 43px; line-height: .96; color: ${C.blue}; letter-spacing: -1px; }
.ibfL-foot-img { position: relative; width: 226px; flex: none; }
.ibfL-foot-img img { display: block; width: 226px; height: 152px; object-fit: cover;
                     border-radius: ${BLOB_ALT};
                     box-shadow: 0 0 0 6px rgba(242,149,0,.15), 0 12px 26px -12px rgba(242,149,0,.45); }

@media print {
  .ibfL { max-width: none; }
  .ibfL-hero, .ibfL-foot { break-inside: avoid; }
  .ibfL-body h3 { break-after: avoid; }
}`;
}

// ---------- Mode: email (Gmail / Outlook) ----------

const EFONT = 'Arial, Helvetica, sans-serif';

// Re-styles the shared markup with inline styles, since Gmail drops <style>
// and Outlook ignores classes.
function emailBody(body: string): string {
  return toHtml(body)
    .replace(/<p>/g, `<p style="margin:0 0 14px;font-family:${EFONT};font-size:15px;line-height:24px;color:${C.ink}">`)
    .replace(/<h3>/g, `<h3 style="margin:22px 0 8px;font-family:${EFONT};font-size:16px;line-height:22px;color:${C.darkBlue}">`)
    .replace(/<ul>/g, `<ul style="margin:0 0 14px;padding-left:22px">`)
    .replace(/<li>/g, `<li style="margin:5px 0;font-family:${EFONT};font-size:15px;line-height:24px;color:${C.ink}">`)
    .replace(/<strong>/g, `<strong style="color:${C.darkBlue}">`);
}

function emailLetter(c: LetterContent, origin: string): string {
  const hero = abs(origin, c.heroImage);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:640px">
  <tr><td style="padding:0 0 18px">
    <img src="${abs(origin, '/images/ibf-logo-blue.png')}" width="200" height="32" alt="Ignatius Book Fairs" style="display:block;border:0;outline:none;text-decoration:none" />
  </td></tr>
  ${
    hero
      ? `<tr><td style="padding:0 0 22px">
    <img src="${esc(hero)}" width="640" alt="" style="display:block;width:100%;max-width:640px;height:auto;border:0;outline:none;text-decoration:none" />
  </td></tr>
  <tr><td style="height:4px;background-color:${C.orange};font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="height:20px;font-size:0;line-height:0">&nbsp;</td></tr>`
      : ''
  }
  ${
    c.subject
      ? `<tr><td style="padding:0 0 14px;font-family:${EFONT};font-size:21px;line-height:27px;font-weight:bold;color:${C.darkBlue}">${esc(c.subject)}</td></tr>`
      : ''
  }
  <tr><td>${emailBody(c.body)}</td></tr>
  <tr><td style="padding:22px 0 0;border-top:2px solid ${C.blue}">
    <span style="font-family:${EFONT};font-size:17px;font-weight:bold;color:${C.blue}">See you at the Book Fair!</span>
  </td></tr>
</table>`;
}

// ---------- Entry points ----------

export function letterFragment(c: LetterContent, origin: string, mode: 'page' | 'email'): string {
  return mode === 'email' ? emailLetter(c, origin) : pageLetter(c, origin);
}

// A standalone document for the print/save-as-PDF path.
export function letterPrintDocument(c: LetterContent, origin: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.name)}</title>
<style>@page { margin: 0.6in; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${letterCss(origin)}</style></head><body>${pageLetter(c, origin)}</body></html>`;
}
