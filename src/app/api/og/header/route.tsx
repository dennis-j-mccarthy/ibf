import { ImageResponse } from 'next/og';
import { accents } from '@/lib/design/tokens';

// Email header renderer: colored band, Fredoka headline (+ optional subhead),
// script eyebrow (Caveat), accent-colored last headline word, optional row of
// book covers, a curved white bottom edge, up to six scattered doodads, and
// two layouts: "center" (default) or "split" (headline left, uploaded image
// right). 1200x450 = 600px-wide email at 2x.
export const runtime = 'nodejs';

const W = 1200;
const H = 450;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const headline = q.get('headline') || 'Hello, book people.';
  const sub = q.get('sub') || '';
  const eyebrow = q.get('eyebrow') || '';
  const bg = q.get('bg') || accents.darkBlue;
  const hColor = q.get('hColor') || '#ffffff';
  const h2Color = q.get('h2Color') || ''; // accent color for the last headline word
  const sColor = q.get('sColor') || 'rgba(255,255,255,0.85)';
  const showLogo = q.get('logo') !== '0';
  const layout = q.get('layout') === 'split' ? 'split' : 'center';
  const img = q.get('img') || '';
  const imgMode = q.get('imgMode') === 'png' ? 'png' : 'card'; // png = transparent cutout, no crop/card
  let doodads: string[] = [];
  try { doodads = JSON.parse(q.get('doodads') || '[]').slice(0, 6); } catch { doodads = []; }
  let books: { title: string; image: string }[] = [];
  try { books = JSON.parse(q.get('books') || '[]').slice(0, 5); } catch { books = []; }
  if (layout === 'split') books = []; // covers only fit the centered layout

  const origin = new URL(req.url).origin;
  const [d700, d500, script] = await Promise.all([
    fetch(`${origin}/fonts/fredoka-700.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/fredoka-500.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/caveat-700.ttf`).then((r) => r.arrayBuffer()),
  ]);

  const busy = books.length > 0 || Boolean(eyebrow);
  const hSize = layout === 'split'
    ? (headline.length > 30 ? 54 : 66)
    : books.length
      ? (headline.length > 26 ? 52 : 62)
      : busy
        ? (headline.length > 30 ? 58 : 72)
        : (headline.length > 34 ? 64 : headline.length > 22 ? 76 : 92);

  // Split the headline so the last word can take the accent color.
  const words = headline.trim().split(/\s+/);
  const lastWord = h2Color && words.length > 1 ? words.pop() : null;

  const headlineNode = (align: 'center' | 'flex-start') => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', fontSize: hSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1, color: hColor, textAlign: align === 'center' ? 'center' : 'left' }}>
      {lastWord ? (
        <>
          <span style={{ marginRight: 16 }}>{words.join(' ')}</span>
          <span style={{ color: h2Color }}>{lastWord}</span>
        </>
      ) : (
        headline
      )}
    </div>
  );

  // Subtle scatter slots around the edges (kept clear of the content column and
  // the split-layout image on the right).
  const slots = layout === 'split'
    ? [
        { top: 22, left: 380, size: 78, rotate: 12 },
        { bottom: 110, left: 40, size: 80, rotate: -10 },
        { top: 140, left: 620, size: 62, rotate: -18 },
        { top: 26, left: 60, size: 66, rotate: 18 },
        { bottom: 130, left: 560, size: 60, rotate: 8 },
        { top: 210, left: 300, size: 54, rotate: -8 },
      ]
    : [
        { top: 30, right: 56, size: 100, rotate: 12 },
        { bottom: 116, left: 42, size: 88, rotate: -10 },
        { top: 24, left: 140, size: 70, rotate: -18 },
        { bottom: 120, right: 150, size: 76, rotate: 16 },
        { top: 150, left: 48, size: 62, rotate: 8 },
        { top: 160, right: 210, size: 58, rotate: -8 },
      ];
  const abs = (u: string) => (u.startsWith('http') ? u : origin + u);

  const doodadImgs = doodads.map((u, i) => {
    const s = slots[i] as { top?: number; bottom?: number; left?: number; right?: number; size: number; rotate: number };
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={i}
        src={abs(u)}
        width={s.size}
        height={s.size}
        alt=""
        style={{ position: 'absolute', ...(s.top !== undefined ? { top: s.top } : {}), ...(s.bottom !== undefined ? { bottom: s.bottom } : {}), ...(s.left !== undefined ? { left: s.left } : {}), ...(s.right !== undefined ? { right: s.right } : {}), transform: `rotate(${s.rotate}deg)`, objectFit: 'contain', opacity: 0.25 }}
      />
    );
  });

  // Bottom edge: arc (default), wave, wave2 (flipped), or flat.
  const curveStyle = q.get('curve') || 'arc';
  const curve =
    curveStyle === 'flat' ? (
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 64, backgroundColor: '#ffffff', display: 'flex' }} />
    ) : curveStyle === 'wave' ? (
      <svg width={W} height={120} viewBox={`0 0 ${W} 120`} style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <path d={`M0,52 C300,118 900,-8 ${W},58 L${W},120 L0,120 Z`} fill="#ffffff" />
      </svg>
    ) : curveStyle === 'wave2' ? (
      <svg width={W} height={120} viewBox={`0 0 ${W} 120`} style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <path d={`M0,58 C300,-8 900,118 ${W},52 L${W},120 L0,120 Z`} fill="#ffffff" />
      </svg>
    ) : (
      <div style={{ position: 'absolute', bottom: -170, left: -240, width: W + 480, height: 220, borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex' }} />
    );

  // Logo always rides top-center, in both layouts.
  const logoBand = showLogo ? (
    <div style={{ position: 'absolute', top: 20, left: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${origin}/images/ibf-logo-white-p-800.png`} width={books.length ? 128 : 150} height={books.length ? 28 : 33} alt="" style={{ display: 'flex' }} />
    </div>
  ) : null;

  const tilts = [-6, 4, -4, 6, -5];
  const coverW = books.length > 3 ? 96 : 112;

  const node = layout === 'split' ? (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodadImgs}
      {logoBand}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, padding: '30px 40px 30px 90px' }}>
        {eyebrow ? <div style={{ display: 'flex', fontFamily: 'Caveat', fontSize: 52, fontWeight: 700, color: hColor, marginBottom: 2 }}>{eyebrow}</div> : null}
        {headlineNode('flex-start')}
        {sub ? <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: sColor, marginTop: 14, maxWidth: 560 }}>{sub}</div> : null}
      </div>
      {img ? (
        imgMode === 'png' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={430} height={380} alt="" style={{ objectFit: 'contain', marginRight: 60, marginBottom: 40 }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={400} height={330} alt="" style={{ objectFit: 'cover', borderRadius: 24, marginRight: 70, marginBottom: 34, boxShadow: '0 18px 44px rgba(0,0,0,0.28)' }} />
        )
      ) : null}
      {curve}
    </div>
  ) : (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodadImgs}
      {logoBand}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 110px', marginTop: books.length ? 14 : showLogo ? 26 : -20 }}>
        {eyebrow ? <div style={{ display: 'flex', fontFamily: 'Caveat', fontSize: books.length ? 48 : 58, fontWeight: 700, color: hColor, marginBottom: 2 }}>{eyebrow}</div> : null}
        {headlineNode('center')}
        {sub ? <div style={{ display: 'flex', fontSize: books.length ? 24 : 32, fontWeight: 500, lineHeight: 1.25, color: sColor, marginTop: books.length ? 10 : 16, textAlign: 'center', maxWidth: 880 }}>{sub}</div> : null}
        {books.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 26, marginTop: 18 }}>
            {books.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={b.image} width={coverW} height={Math.round(coverW * 1.38)} alt="" style={{ objectFit: 'cover', borderRadius: 8, transform: `rotate(${tilts[i % tilts.length]}deg)`, boxShadow: '0 10px 26px rgba(0,0,0,0.3)', marginTop: i % 2 ? 10 : 0 }} />
            ))}
          </div>
        ) : null}
      </div>
      {curve}
    </div>
  );

  return new ImageResponse(node, {
    width: W,
    height: H,
    fonts: [
      { name: 'Fredoka', data: d700, weight: 700, style: 'normal' },
      { name: 'Fredoka', data: d500, weight: 500, style: 'normal' },
      { name: 'Caveat', data: script, weight: 700, style: 'normal' },
    ],
  });
}
