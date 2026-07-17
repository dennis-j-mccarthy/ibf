// Client-side animated MP4 reel renderer. Animates a 1080x1920 canvas — a slow
// Ken Burns push on the photo, a dark wash, line-by-line kinetic statement text,
// and a logo fade-in — then encodes it to H.264 MP4 via WebCodecs + mp4-muxer so
// the file uploads straight to Instagram Reels / TikTok. Runs entirely in the
// browser (no server video pipeline needed).

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export type ReelInput = {
  statement: string;
  sub?: string;
  eyebrow?: string;
  img?: string; // absolute background-photo URL; if absent, a colored field is used
  bg: string; // fallback/solid background color (mode color or navy)
  origin: string; // site origin, for loading the logo + fonts
};

const W = 1080;
const H = 1920;
const FPS = 30;
const DUR = 6; // seconds
const FRAMES = FPS * DUR;
const NAVY = '#02176f';

export function reelSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder === 'function';
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

async function loadFonts(origin: string) {
  const defs: [string, number, string][] = [
    ['Fredoka', 700, 'fredoka-700.ttf'],
    ['Fredoka', 400, 'fredoka-400.ttf'],
  ];
  await Promise.all(
    defs.map(async ([fam, wt, file]) => {
      const face = new FontFace(fam, `url(${origin}/fonts/${file})`, { weight: String(wt) });
      await face.load();
      (document as unknown as { fonts: FontFaceSet }).fonts.add(face);
    }),
  );
  await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
}

// Greedy word-wrap into lines that fit maxWidth at the given font.
function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

type FrameCtx = {
  t: number; // 0..1 over the whole clip
  photo: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  lines: string[];
  subLines: string[];
  input: ReelInput;
  stmtFont: string;
  subFont: string;
  lineH: number;
  subLineH: number;
};

function drawFrame(ctx: CanvasRenderingContext2D, f: FrameCtx) {
  const { t, photo, logo, lines, subLines, input } = f;
  ctx.clearRect(0, 0, W, H);

  // Background: Ken Burns push on the photo, else a solid field.
  if (photo) {
    const zoom = 1.06 + 0.14 * easeOut(t); // slow push-in
    const cover = Math.max(W / photo.width, H / photo.height) * zoom;
    const dw = photo.width * cover;
    const dh = photo.height * cover;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2 - t * 60; // gentle upward drift
    ctx.drawImage(photo, dx, dy, dw, dh);
    // dark wash for legibility
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(2,23,111,0)');
    g.addColorStop(0.45, 'rgba(2,23,111,0.35)');
    g.addColorStop(1, 'rgba(2,23,111,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = input.bg || NAVY;
    ctx.fillRect(0, 0, W, H);
  }

  const pad = 96;
  let y = H - pad - f.subLineH * subLines.length - (subLines.length ? 28 : 0);

  // Statement lines, revealed bottom-up, staggered.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = f.stmtFont;
  ctx.fillStyle = '#ffffff';
  const startY = y;
  for (let i = lines.length - 1; i >= 0; i--) {
    const ly = startY - (lines.length - 1 - i) * f.lineH;
    const start = 0.12 + i * 0.1;
    const a = clamp01((t - start) / 0.32);
    if (a <= 0) continue;
    const rise = (1 - easeOut(a)) * 46;
    ctx.globalAlpha = a;
    ctx.fillText(lines[i], pad, ly + rise);
  }
  ctx.globalAlpha = 1;

  // Sub line(s) fade in after the statement.
  if (subLines.length) {
    ctx.font = f.subFont;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const a = clamp01((t - (0.12 + lines.length * 0.1)) / 0.4);
    ctx.globalAlpha = a;
    subLines.forEach((sl, i) => {
      ctx.fillText(sl, pad, H - pad - (subLines.length - 1 - i) * f.subLineH + (1 - easeOut(a)) * 24);
    });
    ctx.globalAlpha = 1;
  }

  // Eyebrow pill (top-left) fades in early.
  if (input.eyebrow) {
    const a = clamp01((t - 0.05) / 0.3);
    ctx.globalAlpha = a;
    ctx.font = '700 34px Fredoka';
    const label = input.eyebrow.toUpperCase();
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = '#ffd54a';
    const px = 30;
    roundRect(ctx, pad, pad, tw + px * 2, 66, 33);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad + px, pad + 35);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  // Logo fades in near the end, bottom-left under the text.
  if (logo) {
    const a = clamp01((t - 0.66) / 0.22);
    if (a > 0) {
      ctx.globalAlpha = a;
      const lw = 300;
      const lh = lw / (logo.width / logo.height);
      ctx.drawImage(logo, pad, H - pad + 6, lw, lh); // just below content baseline
      ctx.globalAlpha = 1;
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderReelMp4(input: ReelInput, onProgress?: (p: number) => void): Promise<Blob> {
  if (!reelSupported()) {
    throw new Error('This browser can’t encode MP4 (needs WebCodecs — use Chrome or Edge).');
  }
  await loadFonts(input.origin);
  const photo = input.img ? await loadImage(input.img).catch(() => null) : null;
  const logo = await loadImage(`${input.origin}/images/ibf-logo-white-p-800.png`).catch(() => null);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable.');

  const stmtFont = '700 96px Fredoka';
  const subFont = '400 40px Fredoka';
  const lines = wrap(ctx, input.statement, stmtFont, W - 192);
  const subLines = input.sub ? wrap(ctx, input.sub, subFont, W - 192) : [];

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
  let encodeError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e;
    },
  });
  encoder.configure({ codec: 'avc1.42002a', width: W, height: H, bitrate: 8_000_000, framerate: FPS });

  const frameCtx: FrameCtx = { t: 0, photo, logo, lines, subLines, input, stmtFont, subFont, lineH: 108, subLineH: 52 };

  for (let i = 0; i < FRAMES; i++) {
    if (encodeError) throw encodeError instanceof Error ? encodeError : new Error('Video encoding failed.');
    frameCtx.t = i / (FRAMES - 1);
    drawFrame(ctx, frameCtx);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    encoder.encode(frame, { keyFrame: i % FPS === 0 });
    frame.close();
    onProgress?.(i / FRAMES);
    // Relieve encoder backpressure and keep the UI responsive.
    if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  await encoder.flush();
  if (encodeError) throw encodeError instanceof Error ? encodeError : new Error('Video encoding failed.');
  muxer.finalize();
  onProgress?.(1);
  return new Blob([target.buffer], { type: 'video/mp4' });
}
