import type { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import {
  getSchool,
  getUpcomingFair,
  getPastFairs,
  getWishlistLeaderboard,
} from '@/lib/book-fair-admin/queries';
import { getDeal, getDeals, parseDollarString } from '@/lib/book-fair-admin/hubspot';

// Public, embeddable book-fair widgets. Served as raw HTML (not a React page) so
// the embed carries no site chrome and can be iframed onto any school website.
export const dynamic = 'force-dynamic';

type Theme = 'light' | 'dark';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso.replace(' ', 'T')).getTime() - Date.now()) / 86_400_000));
}
function rangeLabel(start?: string | null, end?: string | null): string {
  if (!start) return 'Coming soon';
  const s = new Date(start.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!end) return s;
  const e = new Date(end.replace(' ', 'T')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${s} – ${e}`;
}

function frame(inner: string, opts: { theme: Theme; loupio: boolean; accent: string; origin: string }) {
  const dark = opts.theme === 'dark';
  const loupio = opts.loupio
    ? `<img src="${opts.origin}/images/Loupio-p-500.png" alt="" aria-hidden="true" style="position:absolute;bottom:-8px;right:-8px;width:84px;height:84px;object-fit:contain;pointer-events:none;animation:loupio-bob 3s ease-in-out infinite;filter:drop-shadow(0 4px 6px rgba(0,0,0,.2))">`
    : '';
  const logo = dark ? 'ibf-logo-white.png' : 'ibf-logo-blue.png';
  return `<div style="position:relative;overflow:hidden;border-radius:18px;box-shadow:0 10px 24px rgba(0,0,0,.12);background:${
    dark ? '#02176f' : '#fff'
  };color:${dark ? '#fff' : '#1a1b1f'};font-family:'brother-1816',-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="position:absolute;top:0;left:0;right:0;height:6px;background:${opts.accent}"></div>
    <div style="padding:24px 20px 16px">${inner}</div>
    ${loupio}
    <div style="display:flex;align-items:center;gap:6px;padding:8px 20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${
      dark ? 'rgba(255,255,255,.55)' : '#a0a4b0'
    };border-top:1px solid ${dark ? 'rgba(255,255,255,.12)' : '#f0f0f0'}">
      <img src="${opts.origin}/images/${logo}" alt="Ignatius Book Fairs" style="height:14px;width:auto;object-fit:contain;opacity:.8"> Book Fair
    </div>
  </div>`;
}

const eyebrow = (text: string, color: string) =>
  `<p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:${color};margin:0 0 6px">${esc(
    text
  )}</p>`;

async function buildWidget(
  type: string,
  schoolId: number,
  theme: Theme,
  loupio: boolean,
  sp: URLSearchParams,
  origin: string
): Promise<string> {
  const dark = theme === 'dark';
  const f = (inner: string, accent: string) => frame(inner, { theme, loupio, accent, origin });

  if (type === 'countdown') {
    const [school, fair] = await Promise.all([getSchool(schoolId), getUpcomingFair(schoolId)]);
    const days = fair?.startDate ? daysUntil(fair.startDate) : null;
    return f(
      `${eyebrow(`${school?.name ?? 'Our'} Book Fair`, '#ff6445')}
       <div style="display:flex;align-items:flex-end;gap:8px">
         <span style="font-size:64px;font-weight:800;line-height:1;color:${dark ? '#ffd41d' : '#02176f'}">${
        days ?? '—'
      }</span>
         <span style="font-size:18px;font-weight:700;margin-bottom:4px">${days === 1 ? 'day' : 'days'} to go!</span>
       </div>
       <p style="font-size:14px;margin:6px 0 0;font-weight:600;color:${dark ? 'rgba(255,255,255,.7)' : '#7e828f'}">${esc(
        rangeLabel(fair?.startDate, fair?.endDate)
      )}</p>`,
      '#ff6445'
    );
  }

  if (type === 'goal') {
    const [school, fair, pastFairs] = await Promise.all([
      getSchool(schoolId),
      getUpcomingFair(schoolId),
      getPastFairs(schoolId),
    ]);
    const [upcomingDeal, pastDeals] = await Promise.all([
      fair?.hsDealId ? getDeal(fair.hsDealId) : Promise.resolve(null),
      getDeals(pastFairs.map((p) => p.hsDealId).filter((id): id is string => !!id)),
    ]);
    let prevSales: number | null = null;
    for (const pf of pastFairs) {
      const v = parseDollarString(pf.hsDealId ? pastDeals.get(pf.hsDealId)?.properties.total_sales ?? null : null);
      if (v !== null) {
        prevSales = v;
        break;
      }
    }
    const current = parseDollarString(upcomingDeal?.properties.total_sales ?? null) ?? 0;
    const goalParam = Number(sp.get('goal'));
    const goal = goalParam > 0 ? goalParam : prevSales ? Math.ceil(prevSales / 500) * 500 : 5000;
    const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
    return f(
      `${eyebrow(`${school?.name ?? 'Our'} fundraising goal`, '#1a9d5f')}
       <p style="font-size:30px;font-weight:800;line-height:1;margin:0;color:${dark ? '#ffd41d' : '#02176f'}">${money(
        current
      )} <span style="font-size:16px;font-weight:700;color:${dark ? 'rgba(255,255,255,.6)' : '#7e828f'}">of ${money(
        goal
      )}</span></p>
       <div style="margin-top:12px;height:12px;border-radius:99px;overflow:hidden;background:${
         dark ? 'rgba(255,255,255,.15)' : '#eef0f5'
       }"><div style="height:100%;border-radius:99px;width:${pct}%;background:#50db92"></div></div>
       ${
         prevSales != null
           ? `<p style="font-size:12px;margin:8px 0 0;font-weight:600;color:${
               dark ? 'rgba(255,255,255,.6)' : '#7e828f'
             }">Last fair we raised <b>${money(prevSales)}</b> — help us beat it!</p>`
           : ''
       }`,
      '#50db92'
    );
  }

  if (type === 'teacher' || type === 'family' || type === 'signup') {
    const role = type === 'teacher' ? 'teacher' : type === 'family' ? 'parent' : 'parent';
    const url = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&role=${role}`;
    const copy =
      type === 'teacher'
        ? { eb: 'Teachers', title: 'Build your classroom wishlist', cta: 'Register your classroom', accent: '#0088ff' }
        : type === 'family'
        ? { eb: 'Families', title: 'Shop our online Book Fair', cta: 'Sign up & shop', accent: '#ff6445' }
        : { eb: "Let's read together", title: 'Join our Book Fair!', cta: 'Sign up now', accent: '#0088ff' };
    const qr = await QRCode.toDataURL(url, {
      width: 240,
      margin: 1,
      color: { dark: dark ? '#ffffff' : '#02176f', light: '#00000000' },
    });
    return f(
      `${eyebrow(copy.eb, copy.accent)}
       <p style="font-size:20px;font-weight:700;line-height:1.15;margin:0 0 12px;padding-right:64px">${copy.title}</p>
       <div style="display:flex;align-items:center;gap:12px">
         <img src="${qr}" alt="Sign-up QR code" width="80" height="80" style="flex:0 0 auto">
         <a href="${esc(url)}" target="_blank" rel="noopener" style="display:inline-block;text-align:center;font-weight:700;color:#fff;background:${
        copy.accent
      };border-radius:99px;padding:12px 20px;font-size:14px;text-decoration:none">${copy.cta} →</a>
       </div>
       <p style="font-size:11px;margin:8px 0 0;font-weight:600;color:${
         dark ? 'rgba(255,255,255,.55)' : '#a0a4b0'
       }">Scan the code or tap the button</p>`,
      copy.accent
    );
  }

  if (type === 'leaderboard') {
    const rows = await getWishlistLeaderboard(schoolId, 5);
    const medals = ['#ffd41d', '#c4ccd6', '#e09a5a'];
    const list =
      rows.length === 0
        ? `<p style="font-size:14px;color:${
            dark ? 'rgba(255,255,255,.7)' : '#7e828f'
          }">Wishlists are filling up — check back soon!</p>`
        : `<ol style="list-style:none;margin:0;padding:0 48px 0 0;display:flex;flex-direction:column;gap:6px">${rows
            .map(
              (r, i) =>
                `<li style="display:flex;align-items:center;gap:10px">
                   <span style="flex:0 0 auto;width:24px;height:24px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${
                     i < 3 ? medals[i] : dark ? 'rgba(255,255,255,.12)' : '#eef0f5'
                   };color:${i < 3 ? '#3a2c00' : dark ? '#fff' : '#7e828f'}">${i + 1}</span>
                   <span style="flex:1;min-width:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(
                     r.name
                   )}</span>
                   <span style="flex:0 0 auto;font-size:14px;font-weight:700;color:${
                     dark ? '#ffd41d' : '#02176f'
                   }">${r.itemCount}</span>
                 </li>`
            )
            .join('')}</ol>`;
    return f(
      `${eyebrow('Wishlist leaderboard', '#b8860b')}
       <p style="font-size:18px;font-weight:700;line-height:1.15;margin:0 0 12px">Most books wishlisted</p>${list}`,
      '#ffc107'
    );
  }

  return `<div style="font-family:sans-serif;padding:24px;color:#7e828f">Unknown widget.</div>`;
}

function doc(inner: string, origin: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://use.typekit.net/poj1hyc.css">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:transparent}
  body{padding:2px}
  @keyframes loupio-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-9px) rotate(3deg)}}
</style></head><body>${inner}</body></html>`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  const { type } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const origin = req.nextUrl.origin;
  const schoolId = Number(sp.get('schoolId'));
  const theme: Theme = sp.get('theme') === 'dark' ? 'dark' : 'light';
  const loupio = sp.get('loupio') !== '0';

  let inner: string;
  if (!schoolId) {
    inner = `<div style="font-family:sans-serif;padding:24px;color:#7e828f">Missing schoolId.</div>`;
  } else {
    try {
      inner = await buildWidget(type, schoolId, theme, loupio, sp, origin);
    } catch {
      inner = `<div style="font-family:sans-serif;padding:24px;color:#7e828f">Widget unavailable.</div>`;
    }
  }

  return new Response(doc(inner, origin), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=120',
    },
  });
}
