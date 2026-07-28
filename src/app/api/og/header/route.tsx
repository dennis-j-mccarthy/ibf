import { ImageResponse } from 'next/og';
import { accents } from '@/lib/design/tokens';

// Email header renderer: colored band, Fredoka headline (+ optional subhead),
// a curved white bottom edge so it sits cleanly on a white email body, up to
// three decorative "doodad" images from the Training library, and two layouts:
// "center" (default) or "split" (headline left, uploaded image right).
// 1200x450 = 600px-wide email at 2x.
export const runtime = 'nodejs';

const W = 1200;
const H = 450;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const headline = q.get('headline') || 'Hello, book people.';
  const sub = q.get('sub') || '';
  const bg = q.get('bg') || accents.darkBlue;
  const hColor = q.get('hColor') || '#ffffff';
  const sColor = q.get('sColor') || 'rgba(255,255,255,0.85)';
  const showLogo = q.get('logo') !== '0';
  const layout = q.get('layout') === 'split' ? 'split' : 'center';
  const img = q.get('img') || '';
  let doodads: string[] = [];
  try { doodads = JSON.parse(q.get('doodads') || '[]').slice(0, 3); } catch { doodads = []; }

  const origin = new URL(req.url).origin;
  const [d700, d500] = await Promise.all(
    [700, 500].map((wt) => fetch(`${origin}/fonts/fredoka-${wt}.ttf`).then((r) => r.arrayBuffer())),
  );

  const hSize = layout === 'split'
    ? (headline.length > 30 ? 54 : 66)
    : (headline.length > 34 ? 64 : headline.length > 22 ? 76 : 92);

  // Fixed decorative slots so a couple of doodads always land nicely. In split
  // layout the top-right slot would collide with the image, so it moves left.
  const slots = layout === 'split'
    ? [
        { top: 26, left: 420, size: 96, rotate: 12 },
        { bottom: 120, left: 46, size: 96, rotate: -10 },
        { top: 150, left: 620, size: 72, rotate: -18 },
      ]
    : [
        { top: 34, right: 60, size: 130, rotate: 12 },
        { bottom: 120, left: 46, size: 104, rotate: -10 },
        { top: 26, left: 150, size: 78, rotate: -18 },
      ];

  const doodadImgs = doodads.map((u, i) => {
    const s = slots[i] as { top?: number; bottom?: number; left?: number; right?: number; size: number; rotate: number };
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={i}
        src={u}
        width={s.size}
        height={s.size}
        alt=""
        style={{ position: 'absolute', ...(s.top !== undefined ? { top: s.top } : {}), ...(s.bottom !== undefined ? { bottom: s.bottom } : {}), ...(s.left !== undefined ? { left: s.left } : {}), ...(s.right !== undefined ? { right: s.right } : {}), transform: `rotate(${s.rotate}deg)`, objectFit: 'contain', opacity: 0.95 }}
      />
    );
  });

  const curve = (
    <div style={{ position: 'absolute', bottom: -170, left: -240, width: W + 480, height: 220, borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex' }} />
  );

  const node = layout === 'split' ? (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodadImgs}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, padding: '0 40px 30px 90px' }}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${origin}/images/ibf-logo-white-p-800.png`} width={150} height={33} alt="" style={{ display: 'flex', marginBottom: 24 }} />
        ) : null}
        <div style={{ display: 'flex', fontSize: hSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1, color: hColor }}>{headline}</div>
        {sub ? <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: sColor, marginTop: 14, maxWidth: 560 }}>{sub}</div> : null}
      </div>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} width={400} height={330} alt="" style={{ objectFit: 'cover', borderRadius: 24, marginRight: 70, marginBottom: 34, boxShadow: '0 18px 44px rgba(0,0,0,0.28)' }} />
      ) : null}
      {curve}
    </div>
  ) : (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodadImgs}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 120px', marginTop: showLogo ? 6 : -20 }}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${origin}/images/ibf-logo-white-p-800.png`} width={170} height={37} alt="" style={{ display: 'flex', marginBottom: 26 }} />
        ) : null}
        <div style={{ display: 'flex', fontSize: hSize, fontWeight: 700, lineHeight: 1.02, letterSpacing: -1, color: hColor, textAlign: 'center' }}>{headline}</div>
        {sub ? <div style={{ display: 'flex', fontSize: 32, fontWeight: 500, lineHeight: 1.25, color: sColor, marginTop: 16, textAlign: 'center', maxWidth: 880 }}>{sub}</div> : null}
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
    ],
  });
}
