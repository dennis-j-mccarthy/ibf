import { ImageResponse } from 'next/og';
import { accents, modeColors, neutrals } from '@/lib/design/tokens';

// On-brand social post renderer. Renders the IBF design-system layout archetypes
// as PNGs at platform sizes, in Fredoka (Google Fonts, the design system rounded display; was Outfit/Brother
// 1816 fallback). Driven by query params; the generator fills these from blog
// content (spun + angled per campaign strategy). Fonts are loaded from /public
// so they resolve identically in dev and on Vercel.
export const runtime = 'nodejs';

const SIZES: Record<string, [number, number]> = {
  instagram: [1080, 1080],
  facebook: [1080, 1350],
  story: [1080, 1920],
  tiktok: [1080, 1920],
  pinterest: [1000, 1500],
  x: [1600, 900],
};

type Theme = 'statement' | 'stat' | 'checklist' | 'steps' | 'quote' | 'photo-hero' | 'book-grid';

// Small CSS checkmark (Fredoka has no reliable ✓ glyph, so draw one).
function Check({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', width: 40, height: 40, borderRadius: 10, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', width: 15, height: 24, borderRight: '5px solid #fff', borderBottom: '5px solid #fff', transform: 'rotate(45deg)', marginTop: -6 }} />
    </div>
  );
}

// The real IBF logo: white lockup on dark/colored backgrounds (color==='#fff'),
// full-color primary logo on light backgrounds. `origin` is needed so satori can
// fetch the asset from /public/images.
function Wordmark({ origin, color }: { origin: string; color: string }) {
  const onDark = color.toLowerCase() === '#fff' || color.toLowerCase() === '#ffffff';
  // White lockup on dark/colored backgrounds; blue lockup on light ones.
  const src = onDark ? `${origin}/images/ibf-logo-white-p-800.png` : `${origin}/images/ibf-logo-blue.png`;
  const ratio = onDark ? 4.6 : 6.34; // intrinsic aspect ratios of those assets
  const wdt = 236;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={wdt} height={Math.round(wdt / ratio)} alt="Ignatius Book Fairs" style={{ display: 'flex' }} />
  );
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const theme = (q.get('theme') || 'statement') as Theme;
  const statement = q.get('statement') || 'We start with no.';
  const sub = q.get('sub') || '';
  const eyebrow = (q.get('eyebrow') || '').toUpperCase();
  const statLabel = (q.get('statLabel') || '').toUpperCase();
  const items = (q.get('items') || '').split('|').map((s) => s.trim()).filter(Boolean);
  let books: { title: string; image: string }[] = [];
  try { books = JSON.parse(q.get('books') || '[]'); } catch { books = []; }
  const mode = q.get('mode') as keyof typeof modeColors | null;
  const modeColor = mode && modeColors[mode] ? modeColors[mode] : modeColors.catholic;
  const [w, h] = SIZES[q.get('size') || 'instagram'] || SIZES.instagram;

  // Optional per-post color overrides from the Tweak tool (fall back to theme
  // defaults when blank): bg = background, hColor = headline, eColor = eyebrow,
  // sColor = sub/blurb.
  const bgOv = q.get('bg') || '';
  const hOv = q.get('hColor') || '';
  const eOv = q.get('eColor') || '';
  const sOv = q.get('sColor') || '';

  const origin = new URL(req.url).origin;
  const [d700, d600, d400] = await Promise.all(
    [700, 600, 400].map((wt) => fetch(`${origin}/fonts/fredoka-${wt}.ttf`).then((r) => r.arrayBuffer()))
  );
  const fonts = [
    { name: 'Fredoka', data: d700, weight: 700 as const, style: 'normal' as const },
    { name: 'Fredoka', data: d600, weight: 600 as const, style: 'normal' as const },
    { name: 'Fredoka', data: d400, weight: 400 as const, style: 'normal' as const },
  ];
  const pad = 92;
  const base = { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' as const, padding: pad, fontFamily: 'Fredoka' };

  let node: React.ReactNode;

  if (theme === 'stat') {
    // Big Stat — cream field, oversized orange number (By the Numbers).
    node = (
      <div style={{ ...base, backgroundColor: bgOv || neutrals.cream, color: neutrals.ink, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: eOv || accents.orange }}>{eyebrow || 'BY THE NUMBERS'}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 240, fontWeight: 700, lineHeight: 1, letterSpacing: -6, color: hOv || accents.orange }}>{statement}</div>
          {statLabel ? <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, letterSpacing: 6, color: neutrals.slate, marginTop: 8 }}>{statLabel}</div> : null}
          {sub ? <div style={{ display: 'flex', fontSize: 36, fontWeight: 400, lineHeight: 1.3, color: sOv || neutrals.ink, marginTop: 30, maxWidth: 840 }}>{sub}</div> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Wordmark origin={origin} color={accents.darkBlue} />
          <div style={{ display: 'flex', fontSize: 20, color: neutrals.slate }}>ignatiusbookfairs.com</div>
        </div>
      </div>
    );
  } else if (theme === 'checklist') {
    // Feature Checklist — white field, headline + checkmark list.
    node = (
      <div style={{ ...base, backgroundColor: bgOv || '#ffffff', color: neutrals.ink, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: eOv || modeColor }}>{eyebrow || 'WHAT YOU GET'}</div>
          <div style={{ display: 'flex', fontSize: 74, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: hOv || accents.darkBlue, marginTop: 20, maxWidth: 880 }}>{statement}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 5).map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
              <Check color={modeColors.parish} />
              <div style={{ display: 'flex', fontSize: 38, fontWeight: 600, color: neutrals.ink, marginLeft: 26 }}>{it}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}><Wordmark origin={origin} color={accents.darkBlue} /></div>
      </div>
    );
  } else if (theme === 'steps') {
    // Numbered Steps — mode field, numbered circles.
    node = (
      <div style={{ ...base, backgroundColor: bgOv || modeColor, color: '#fff', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: eOv || accents.yellow }}>{eyebrow || 'HOW IT WORKS'}</div>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, lineHeight: 1, letterSpacing: -2, color: hOv || '#fff', marginTop: 18, maxWidth: 860 }}>{statement}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 4).map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', width: 66, height: 66, borderRadius: 999, backgroundColor: accents.yellow, color: accents.darkBlue, fontSize: 34, fontWeight: 700, alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, marginLeft: 26 }}>{it}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}><Wordmark origin={origin} color="#fff" /></div>
      </div>
    );
  } else if (theme === 'quote') {
    // Big Quote — mint field, large quote + attribution.
    node = (
      <div style={{ ...base, backgroundColor: bgOv || accents.mint, color: accents.darkBlue, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 200, fontWeight: 700, lineHeight: 0.7, color: eOv || modeColor }}>&ldquo;</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1, color: hOv || accents.darkBlue, maxWidth: 880 }}>{statement}</div>
          {sub ? <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, letterSpacing: 2, color: sOv || neutrals.slate, marginTop: 34, textTransform: 'uppercase' }}>{sub}</div> : null}
        </div>
        <div style={{ display: 'flex' }}><Wordmark origin={origin} color={accents.darkBlue} /></div>
      </div>
    );
  } else if (theme === 'photo-hero') {
    // Photo Hero — full-bleed lifestyle photo + dark wash, bold statement at bottom.
    // `img` is either an absolute URL (Training library) or a public/brand filename.
    const imgParam = q.get('img') || 'photo-02.jpg';
    const imgUrl = /^https?:\/\//i.test(imgParam) ? imgParam : `${origin}/brand/photos/${imgParam}`;
    const sSize = w >= 1600 ? 84 : statement.length > 42 ? 76 : 100;
    node = (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', fontFamily: 'Fredoka' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl} width={w} height={h} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(to top, rgba(2,23,111,0.95) 4%, rgba(2,23,111,0.45) 42%, rgba(2,23,111,0) 74%)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', height: '100%', padding: pad }}>
          {eyebrow ? (
            <div style={{ display: 'flex', alignSelf: 'flex-start', backgroundColor: eOv || accents.yellow, color: accents.darkBlue, fontSize: 22, fontWeight: 700, letterSpacing: 3, padding: '10px 20px', borderRadius: 999, marginBottom: 26 }}>{eyebrow}</div>
          ) : null}
          <div style={{ display: 'flex', fontSize: sSize, fontWeight: 700, lineHeight: 1.0, letterSpacing: -2, color: hOv || '#fff', maxWidth: w - 184 }}>{statement}</div>
          {sub ? <div style={{ display: 'flex', fontSize: 34, fontWeight: 400, lineHeight: 1.3, color: sOv || 'rgba(255,255,255,0.92)', marginTop: 22, maxWidth: 820 }}>{sub}</div> : null}
          <div style={{ display: 'flex', marginTop: 34 }}><Wordmark origin={origin} color="#fff" /></div>
        </div>
      </div>
    );
  } else if (theme === 'book-grid') {
    // Book Grid — cream field, a row of real book covers + titles.
    const n = Math.max(books.length, 1);
    const coverW = Math.min(240, Math.floor((w - 184 - (n - 1) * 28) / n));
    node = (
      <div style={{ ...base, backgroundColor: bgOv || neutrals.cream, color: neutrals.ink, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: eOv || accents.orange }}>{eyebrow || 'FEATURED BOOKS'}</div>
          <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, lineHeight: 1.02, letterSpacing: -1, color: hOv || accents.darkBlue, marginTop: 14, maxWidth: w - 184 }}>{statement || 'Good books for great kids.'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 28, justifyContent: 'center', alignItems: 'flex-start', width: '100%' }}>
          {books.slice(0, 5).map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: coverW }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} width={coverW} height={Math.round(coverW * 1.4)} style={{ objectFit: 'cover', borderRadius: 10 }} alt="" />
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, textAlign: 'center', color: neutrals.ink, marginTop: 12, lineHeight: 1.2 }}>{b.title.slice(0, 40)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}><Wordmark origin={origin} color={accents.darkBlue} /></div>
      </div>
    );
  } else {
    // Bold Statement (default) — mode/navy field, big statement + subline.
    const bg = bgOv || (mode && modeColors[mode] ? modeColors[mode] : accents.darkBlue);
    const sSize = w >= 1600 ? 108 : statement.length > 40 ? 88 : 120;
    node = (
      <div style={{ ...base, backgroundColor: bg, color: '#fff', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, letterSpacing: 5, color: eOv || accents.yellow }}>{eyebrow || 'IGNATIUS BOOK FAIRS'}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: sSize, fontWeight: 700, lineHeight: 1.0, letterSpacing: -2, color: hOv || '#fff', maxWidth: w - 184 }}>{statement}</div>
          {sub ? <div style={{ display: 'flex', fontSize: 36, fontWeight: 400, lineHeight: 1.32, color: sOv || 'rgba(255,255,255,0.82)', marginTop: 30, maxWidth: 840 }}>{sub}</div> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Wordmark origin={origin} color="#fff" />
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>ignatiusbookfairs.com</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(node, { width: w, height: h, fonts });
}
