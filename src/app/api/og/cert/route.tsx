import { ImageResponse } from 'next/og';
import { accents, neutrals } from '@/lib/design/tokens';

// Certificate renderer: 11x8.5 landscape (1650x1275 = 150dpi letter), modeled
// on the IBB Certificate of Participation — colored border scattered with
// doodads, white inner card, Fredoka title, script recipient name over a line,
// twin signature blocks, and a gold star seal.
export const runtime = 'nodejs';

const W = 1650;
const H = 1275;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const title = q.get('title') || 'Certificate of Participation';
  const recipient = q.get('recipient') || '';
  const body = q.get('body') || 'for valiant competition, outstanding reading skills, and cooperative teamwork.';
  const date = q.get('date') || '';
  const sig1Name = q.get('sig1Name') || '';
  const sig1Title = q.get('sig1Title') || '';
  const sig2Name = q.get('sig2Name') || '';
  const sig2Title = q.get('sig2Title') || '';
  const bg = q.get('bg') || '#0088ff';
  const hColor = q.get('hColor') || accents.darkBlue;
  const sColor = q.get('sColor') || accents.darkBlue;
  const showLogo = q.get('logo') !== '0';
  const showSeal = q.get('seal') !== '0';
  let doodads: string[] = [];
  try { doodads = JSON.parse(q.get('doodads') || '[]').slice(0, 10); } catch { doodads = []; }

  const origin = new URL(req.url).origin;
  const [d700, d500, script] = await Promise.all([
    fetch(`${origin}/fonts/fredoka-700.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/fredoka-500.ttf`).then((r) => r.arrayBuffer()),
    fetch(`${origin}/fonts/caveat-700.ttf`).then((r) => r.arrayBuffer()),
  ]);

  // Border scatter slots — around the colored frame, clear of the inner card.
  const slots = [
    { top: 18, left: 60, size: 120, rotate: -15 },
    { top: 10, left: 560, size: 95, rotate: 20 },
    { top: 22, right: 120, size: 110, rotate: 10 },
    { top: 420, left: 8, size: 100, rotate: -8 },
    { top: 430, right: 6, size: 105, rotate: 14 },
    { bottom: 16, left: 90, size: 110, rotate: 12 },
    { bottom: 8, left: 640, size: 90, rotate: -18 },
    { bottom: 20, right: 90, size: 115, rotate: -10 },
    { top: 800, left: 10, size: 90, rotate: 18 },
    { top: 810, right: 12, size: 92, rotate: -14 },
  ];
  const abs = (u: string) => (u.startsWith('http') ? u : origin + u);

  const rSize = recipient.length > 26 ? 88 : recipient.length > 16 ? 104 : 120;

  const sigBlock = (name: string, sigTitle: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 420 }}>
      <div style={{ display: 'flex', width: 360, borderBottom: `3px solid ${neutrals.ink}`, height: 44 }} />
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 500, color: neutrals.ink, marginTop: 14 }}>{name}</div>
      {sigTitle ? <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: hColor, marginTop: 4, textAlign: 'center' }}>{sigTitle}</div> : null}
    </div>
  );

  const node = (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', backgroundColor: bg, fontFamily: 'Fredoka', overflow: 'hidden', padding: 90 }}>
      {doodads.map((u, i) => {
        const s = slots[i] as { top?: number; bottom?: number; left?: number; right?: number; size: number; rotate: number };
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={abs(u)} width={s.size} height={s.size} alt="" style={{ position: 'absolute', ...(s.top !== undefined ? { top: s.top } : {}), ...(s.bottom !== undefined ? { bottom: s.bottom } : {}), ...(s.left !== undefined ? { left: s.left } : {}), ...(s.right !== undefined ? { right: s.right } : {}), transform: `rotate(${s.rotate}deg)`, objectFit: 'contain', opacity: 0.35 }} />
        );
      })}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flex: 1, backgroundColor: '#fafbff', borderRadius: 6, padding: '54px 80px 46px', boxShadow: '0 10px 40px rgba(0,0,0,0.18)' }}>
        {showLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${origin}/images/ibb-logo.png`} width={172} height={220} alt="" style={{ display: 'flex', marginBottom: 30 }} />
        ) : null}

        <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, letterSpacing: -1, color: hColor, textAlign: 'center' }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, letterSpacing: 12, color: '#0088ff', marginTop: 26 }}>PRESENTED TO</div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 1000, borderBottom: `3px solid ${neutrals.ink}`, marginTop: 6 }}>
          <div style={{ display: 'flex', fontFamily: 'Caveat', fontSize: rSize, fontWeight: 700, color: neutrals.ink, lineHeight: 1.1, minHeight: 130, alignItems: 'flex-end' }}>{recipient}</div>
        </div>

        {body ? <div style={{ display: 'flex', fontSize: 34, fontWeight: 500, color: sColor, marginTop: 30, textAlign: 'center', maxWidth: 1120 }}>{body}</div> : null}
        {date ? <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: neutrals.ink, marginTop: 22 }}>{date}</div> : null}

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 60, marginTop: 'auto', width: '100%' }}>
          {sigBlock(sig1Name, sig1Title)}
          {showSeal ? (
            <svg width="150" height="150" viewBox="0 0 150 150" style={{ marginBottom: 6 }}>
              <circle cx="75" cy="75" r="66" fill={accents.yellow} />
              <circle cx="75" cy="75" r="66" fill="none" stroke={accents.yellow} strokeWidth="10" strokeDasharray="4 9" strokeLinecap="round" />
              <polygon points="75,34 87,63 119,63 93,82 103,113 75,94 47,113 57,82 31,63 63,63" fill={hColor} />
            </svg>
          ) : (
            <div style={{ display: 'flex', width: 150 }} />
          )}
          {sigBlock(sig2Name, sig2Title)}
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
