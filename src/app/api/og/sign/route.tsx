import { ImageResponse } from 'next/og';
import QRCode from 'qrcode';
import { accents } from '@/lib/design/tokens';

// Printable sign renderer: 8.5x11 portrait (1275x1650 = 150dpi letter), in the
// style of the brand QR category signs (see Training doc "table-category-signs"):
// script eyebrow, big Fredoka headline with an accent-colored last word, white
// QR tile, angled book covers, doodads, curved white bottom with logo + footer.
export const runtime = 'nodejs';

const W = 1275;
const H = 1650;

// Perceived luminance — decides whether the QR can use the field color or
// needs the dark brand blue to stay scannable on the white tile.
const luminance = (hex: string) => {
  const m = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const headline = q.get('headline') || 'Book Fair This Week!';
  const sub = q.get('sub') || '';
  const eyebrow = q.get('eyebrow') || '';
  const footer = q.get('footer') || '';
  const bg = q.get('bg') || accents.darkBlue;
  const hColor = q.get('hColor') || '#ffffff';
  const h2Color = q.get('h2Color') || ''; // accent color for the last headline word
  const sColor = q.get('sColor') || 'rgba(255,255,255,0.88)';
  const showLogo = q.get('logo') !== '0';
  const qrUrl = q.get('qr') || '';
  const curveStyle = q.get('curve') || 'arc';
  const img = q.get('img') || '';
  // blob = organic shape (default), card = rounded photo, png = transparent cutout
  const imgMode = ['png', 'card'].includes(q.get('imgMode') || '') ? (q.get('imgMode') as 'png' | 'card') : 'blob';
  let doodads: string[] = [];
  try { doodads = JSON.parse(q.get('doodads') || '[]').slice(0, 8); } catch { doodads = []; }
  let books: { title: string; image: string }[] = [];
  try { books = JSON.parse(q.get('books') || '[]').slice(0, 6); } catch { books = []; }

  const origin = new URL(req.url).origin;
  const [d700, d500, script] = await Promise.all([
    fetch(`${origin}/fonts/fredoka-700.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/fredoka-500.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/caveat-700.ttf`).then((r) => r.arrayBuffer()),
  ]);

  // QR: field color when it's dark enough to scan, else brand dark blue.
  let qrData = '';
  if (qrUrl) {
    const dark = luminance(bg) < 0.45 ? bg : accents.darkBlue;
    qrData = await QRCode.toDataURL(qrUrl, { width: 640, margin: 1, color: { dark, light: '#ffffff' } });
  }

  const busy = Boolean(qrUrl) || books.length > 0 || Boolean(img);
  const hSize = busy ? (headline.length > 26 ? 88 : 104) : headline.length > 30 ? 108 : headline.length > 18 ? 132 : 156;

  // Split the headline so the last word can take the accent color.
  const words = headline.trim().split(/\s+/);
  const lastWord = h2Color && words.length > 1 ? words.pop() : null;

  // Scatter slots around the edges, like the printed category signs — the
  // doodads stay subtle (low opacity) and out of the content column.
  const slots = [
    { top: 70, left: 70, size: 130, rotate: -15 },
    { top: 56, right: 200, size: 105, rotate: 20 },
    { top: 350, right: 60, size: 150, rotate: 12 },
    { top: 540, left: 48, size: 120, rotate: -10 },
    { top: 880, right: 70, size: 130, rotate: 18 },
    { top: 1010, left: 56, size: 110, rotate: -20 },
    { top: 210, left: 170, size: 85, rotate: 8 },
    { top: 760, right: 190, size: 90, rotate: -8 },
  ];
  const abs = (u: string) => (u.startsWith('http') ? u : origin + u);

  // Alternating tilt on covers, like the printed category signs.
  const coverW = books.length > 3 ? 240 : 270;
  const tilts = [-7, 4, -4, 7, -6, 5];

  const node = (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden' }}>
      {doodads.map((u, i) => {
        const s = slots[i] as { top?: number; left?: number; right?: number; size: number; rotate: number };
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={abs(u)} width={s.size} height={s.size} alt="" style={{ position: 'absolute', ...(s.top !== undefined ? { top: s.top } : {}), ...(s.left !== undefined ? { left: s.left } : {}), ...(s.right !== undefined ? { right: s.right } : {}), transform: `rotate(${s.rotate}deg)`, objectFit: 'contain', opacity: 0.25 }} />
        );
      })}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 100px', marginTop: busy ? 90 : 340 }}>
        {eyebrow ? (
          <div style={{ display: 'flex', fontFamily: 'Caveat', fontSize: 84, fontWeight: 700, color: hColor, marginBottom: 8 }}>{eyebrow}</div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontSize: hSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: 2, color: hColor, textAlign: 'center' }}>
          {lastWord ? (
            <>
              <span style={{ marginRight: 24 }}>{words.join(' ')}</span>
              <span style={{ color: h2Color }}>{lastWord}</span>
            </>
          ) : (
            headline
          )}
        </div>
        {sub ? <div style={{ display: 'flex', fontSize: busy ? 36 : 52, fontWeight: 500, lineHeight: 1.3, color: sColor, marginTop: 26, textAlign: 'center', maxWidth: 980 }}>{sub}</div> : null}
      </div>

      {img ? (
        imgMode === 'png' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={620} height={440} alt="" style={{ objectFit: 'contain', marginTop: 44 }} />
        ) : imgMode === 'blob' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={620} height={470} alt="" style={{ objectFit: 'cover', borderRadius: '62% 38% 56% 44% / 44% 58% 42% 60%', transform: 'rotate(-3deg)', marginTop: 44, boxShadow: '0 22px 54px rgba(0,0,0,0.3)' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} width={620} height={440} alt="" style={{ objectFit: 'cover', borderRadius: 28, marginTop: 44, boxShadow: '0 22px 54px rgba(0,0,0,0.3)' }} />
        )
      ) : null}

      {qrData ? (
        <div style={{ display: 'flex', backgroundColor: '#ffffff', borderRadius: 34, padding: 26, marginTop: 44, boxShadow: '0 18px 44px rgba(0,0,0,0.22)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrData} width={300} height={300} alt="" style={{ display: 'flex' }} />
        </div>
      ) : null}

      {books.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 30, width: 1040, marginTop: qrData ? 50 : 70 }}>
          {books.map((b, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={b.image} width={coverW} height={Math.round(coverW * 1.38)} alt="" style={{ objectFit: 'cover', borderRadius: 10, transform: `rotate(${tilts[i % tilts.length]}deg)`, boxShadow: '0 18px 44px rgba(0,0,0,0.32)', marginTop: i % 2 ? 44 : 0 }} />
          ))}
        </div>
      ) : null}

      {/* White bottom band (arc/wave/wave2/flat) with logo + footer note */}
      {curveStyle === 'flat' ? (
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 190, backgroundColor: '#ffffff', display: 'flex' }} />
      ) : curveStyle === 'wave' ? (
        <svg width={W} height={300} viewBox={`0 0 ${W} 300`} style={{ position: 'absolute', bottom: 0, left: 0 }}>
          <path d={`M0,118 C330,255 950,-14 ${W},130 L${W},300 L0,300 Z`} fill="#ffffff" />
        </svg>
      ) : curveStyle === 'wave2' ? (
        <svg width={W} height={300} viewBox={`0 0 ${W} 300`} style={{ position: 'absolute', bottom: 0, left: 0 }}>
          <path d={`M0,130 C330,-14 950,255 ${W},118 L${W},300 L0,300 Z`} fill="#ffffff" />
        </svg>
      ) : (
        <div style={{ position: 'absolute', bottom: -300, left: -260, width: W + 520, height: 560, borderRadius: '50%', backgroundColor: '#ffffff', display: 'flex' }} />
      )}
      <div style={{ position: 'absolute', bottom: 62, left: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 52, maxWidth: 1080 }}>
          {showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${origin}/images/ibf-logo-blue.png`} width={270} height={43} alt="" style={{ display: 'flex' }} />
          ) : null}
          {footer ? (
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, lineHeight: 1.4, color: accents.darkBlue, maxWidth: 600 }}>{footer}</div>
          ) : null}
        </div>
      </div>
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
