import { ImageResponse } from 'next/og';
import { accents } from '@/lib/design/tokens';

// Printable sign renderer: 8.5x11 portrait (1275x1650 = 150dpi letter). Same
// brand language as the email header — Fredoka, brand color field, curved
// white bottom (with the blue logo), up to three Training-library doodads.
export const runtime = 'nodejs';

const W = 1275;
const H = 1650;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const headline = q.get('headline') || 'Book Fair This Week!';
  const sub = q.get('sub') || '';
  const bg = q.get('bg') || accents.darkBlue;
  const hColor = q.get('hColor') || '#ffffff';
  const sColor = q.get('sColor') || 'rgba(255,255,255,0.85)';
  const showLogo = q.get('logo') !== '0';
  let doodads: string[] = [];
  try { doodads = JSON.parse(q.get('doodads') || '[]').slice(0, 3); } catch { doodads = []; }
  let books: { title: string; image: string }[] = [];
  try { books = JSON.parse(q.get('books') || '[]').slice(0, 6); } catch { books = []; }

  const origin = new URL(req.url).origin;
  const [d700, d500] = await Promise.all(
    [700, 500].map((wt) => fetch(`${origin}/fonts/fredoka-${wt}.ttf`).then((r) => r.arrayBuffer())),
  );

  const hSize = books.length
    ? (headline.length > 30 ? 84 : 104)
    : headline.length > 30 ? 108 : headline.length > 18 ? 132 : 156;

  const slots = [
    { top: 90, right: 90, size: 230, rotate: 12 },
    { top: 640, left: 70, size: 180, rotate: -10 },
    { top: 110, left: 120, size: 140, rotate: -18 },
  ];

  const node = (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodads.map((u, i) => {
        const s = slots[i] as { top?: number; left?: number; right?: number; size: number; rotate: number };
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={u}
            width={s.size}
            height={s.size}
            alt=""
            style={{ position: 'absolute', ...(s.top !== undefined ? { top: s.top } : {}), ...(s.left !== undefined ? { left: s.left } : {}), ...(s.right !== undefined ? { right: s.right } : {}), transform: `rotate(${s.rotate}deg)`, objectFit: 'contain', opacity: 0.95 }}
          />
        );
      })}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 110px', marginTop: books.length ? 170 : 400 }}>
        <div style={{ display: 'flex', fontSize: hSize, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: hColor, textAlign: 'center' }}>{headline}</div>
        {sub ? <div style={{ display: 'flex', fontSize: books.length ? 42 : 52, fontWeight: 500, lineHeight: 1.3, color: sColor, marginTop: 30, textAlign: 'center', maxWidth: 980 }}>{sub}</div> : null}
      </div>

      {/* Optional book covers (up to 6, wraps into two rows of 3) */}
      {books.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 44, width: 940, marginTop: 60 }}>
          {books.map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 250 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} width={250} height={355} alt="" style={{ objectFit: 'cover', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }} />
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, textAlign: 'center', color: hColor, marginTop: 14, lineHeight: 1.2 }}>{b.title.slice(0, 44)}</div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Curved white bottom with the full-color logo */}
      <div style={{ position: 'absolute', bottom: -300, left: -260, width: W + 520, height: 560, borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 90 }}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${origin}/images/ibf-logo-blue.png`} width={330} height={52} alt="" style={{ display: 'flex' }} />
        ) : null}
      </div>
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
