# "Make a Video" Recorder — Handoff

A self-contained, in-browser **Loom-style screen + webcam recorder**. It captures
the screen and the webcam, composites the webcam into a **circular bubble in the
bottom-right corner**, records to a single video file, and lets the user preview
and download it (or hand the file off to an upload/publish pipeline).

Everything runs **client-side** — `getDisplayMedia` + `getUserMedia` + `<canvas>`
compositing + `MediaRecorder`. No server is required to record; a server/video
service is only needed to *store and serve* the result (see "Publish pipeline").

Built and working in a Next.js 16 + React + TypeScript + Tailwind app. This doc is
written so a different Claude Code project can lift and adapt it. Stack-specific
bits (auth, routing, brand classes) are called out as adaptable.

---

## 1. UX flow

`idle → ready → recording ⇄ paused → recorded`

1. **Start capture** → browser prompts to share a screen/window/tab; webcam + mic
   are requested too (both optional — screen-only still works if the camera is
   denied).
2. **Live preview** shows the composited canvas (screen with the webcam bubble).
3. **Record / Pause / Resume / Stop**, with a running `mm:ss` timer and a toggle
   to hide the webcam bubble (screen-only).
4. **Recorded** state plays the clip back inline with **Download** / **Record
   another**. (In the host app, this is where you upload/publish instead.)

---

## 2. Architecture & the key techniques (with the "why")

- **Compositing on a `<canvas>`.** Two hidden `<video>` elements hold the screen
  and webcam streams. A draw loop paints the screen full-frame, then draws the
  webcam center-cropped to a square, clipped to a circle, mirrored, with a ring +
  shadow. `canvas.captureStream(30)` turns the canvas into a video track.
- **Audio is mixed via WebAudio.** Mic audio and (optional) shared tab/system
  audio are piped through an `AudioContext` → `MediaStreamAudioDestinationNode`
  into a single mixed audio track, which is added to the recorded stream.
- **`MediaRecorder`** records the combined (canvas video + mixed audio) stream to
  chunks → a `Blob`. Mime type is chosen MP4-first, falling back to WebM.
- **The draw loop runs on a Web Worker timer, NOT `requestAnimationFrame`.** This
  is the single most important design decision. `rAF` (and main-thread timers) are
  **paused when the browser tab is backgrounded** — so the moment the user
  switches tabs to demo something, canvas compositing stops and the recording
  goes black/frozen. A `setInterval` inside a **Web Worker** keeps firing in the
  background, so the canvas keeps compositing and the recording keeps going. There
  is an rAF fallback if Workers are unavailable.

---

## 3. Full component source

`src/app/admin/tutorials/record/page.tsx` (Next.js App Router client component).
Tailwind classes; `#02176f` is the app's navy brand color and `font-brother` is a
brand font — swap those for your app. It is otherwise drop-in.

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// In-browser Loom-style screen + webcam recorder that composites the webcam into
// a circular bubble in the bottom-right corner. Runs entirely in the browser
// (getDisplayMedia + getUserMedia + canvas compositing + MediaRecorder). The
// recorded file can be previewed and downloaded, or handed to an upload pipeline.

type Phase = 'idle' | 'ready' | 'recording' | 'paused' | 'recorded';

const MIME_PREFERENCES = [
  'video/mp4;codecs=avc1',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_PREFERENCES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecordTutorialPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<{ url: string; blob: Blob; ext: string } | null>(null);

  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mixedAudioRef = useRef<MediaStreamTrack | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickWorkerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const camOnRef = useRef(camOn);
  camOnRef.current = camOn;

  // Draw ONE composited frame. Driven by a Web Worker timer (see startTicker)
  // rather than requestAnimationFrame so compositing keeps running when the tab
  // is backgrounded (rAF is paused in background tabs -> frozen/black capture).
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const sv = screenVideoRef.current;
    if (!canvas || !sv) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (sv.videoWidth) {
      if (canvas.width !== sv.videoWidth || canvas.height !== sv.videoHeight) {
        canvas.width = sv.videoWidth;
        canvas.height = sv.videoHeight;
      }
      ctx.drawImage(sv, 0, 0, canvas.width, canvas.height);
    }
    const cv = camVideoRef.current;
    if (camOnRef.current && cv && cv.videoWidth) {
      const d = Math.min(canvas.width, canvas.height) * 0.24;
      const margin = d * 0.18;
      const cx = canvas.width - margin - d / 2;
      const cy = canvas.height - margin - d / 2;
      const side = Math.min(cv.videoWidth, cv.videoHeight);
      const sx = (cv.videoWidth - side) / 2;
      const sy = (cv.videoHeight - side) / 2;
      // soft shadow
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = d * 0.12;
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();
      // mirrored webcam clipped to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx + d / 2, cy - d / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(cv, sx, sy, side, side, 0, 0, d, d);
      ctx.restore();
      // ring
      ctx.beginPath();
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, d * 0.02);
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
  }, []);

  // A Worker's setInterval keeps firing when the page tab is not focused, unlike
  // main-thread rAF/timers. This is what keeps the recording alive across tabs.
  const startTicker = useCallback(() => {
    if (tickWorkerRef.current) return;
    try {
      const src = `let t=null;onmessage=e=>{if(e.data&&e.data.type==='start'){t=setInterval(()=>postMessage(0),e.data.ms||33);}else{clearInterval(t);t=null;}};`;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
      w.onmessage = () => drawFrame();
      w.postMessage({ type: 'start', ms: 33 });
      tickWorkerRef.current = w;
    } catch {
      const loop = () => {
        drawFrame();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [drawFrame]);

  const stopTicker = useCallback(() => {
    if (tickWorkerRef.current) {
      tickWorkerRef.current.postMessage({ type: 'stop' });
      tickWorkerRef.current.terminate();
      tickWorkerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopAllTracks = useCallback(() => {
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
    camStreamRef.current = null;
    stopTicker();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    mixedAudioRef.current = null;
  }, [stopTicker]);

  const startCapture = useCallback(async () => {
    setError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      let cam: MediaStream | null = null;
      try {
        cam = await navigator.mediaDevices.getUserMedia({
          // native landscape (head-and-shoulders) — a forced square makes the
          // browser zoom in and the circular bubble then clips the face.
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
      } catch {
        cam = null; // webcam/mic optional — allow screen-only recordings
        setCamOn(false);
      }
      displayStreamRef.current = display;
      camStreamRef.current = cam;

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = display;
        await screenVideoRef.current.play().catch(() => {});
      }
      if (cam && camVideoRef.current) {
        camVideoRef.current.srcObject = cam;
        await camVideoRef.current.play().catch(() => {});
      }

      // mix any available audio (mic + shared tab/system audio) into one track
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const dest = ac.createMediaStreamDestination();
      let hasAudio = false;
      [cam, display].forEach((s) => {
        if (s && s.getAudioTracks().length) {
          ac.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest);
          hasAudio = true;
        }
      });
      audioCtxRef.current = ac;
      mixedAudioRef.current = hasAudio ? dest.stream.getAudioTracks()[0] : null;

      // if the user ends the screen share from the browser chrome, stop cleanly
      display.getVideoTracks()[0].addEventListener('ended', () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        } else {
          stopAllTracks();
          setPhase('idle');
        }
      });

      startTicker();
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start screen capture.');
      setPhase('idle');
    }
  }, [startTicker, stopAllTracks]);

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mimeType = pickMimeType();
    const canvasStream = canvas.captureStream(30);
    const combined = new MediaStream();
    canvasStream.getVideoTracks().forEach((t) => combined.addTrack(t));
    if (mixedAudioRef.current) combined.addTrack(mixedAudioRef.current);

    chunksRef.current = [];
    const rec = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes('mp4') ? 'mp4' : 'webm';
      setRecorded({ url: URL.createObjectURL(blob), blob, ext });
      setPhase('recorded');
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllTracks();
      // HOST-APP HOOK: this is where you'd call onRecorded({ blob, type }) to
      // upload/publish instead of (or in addition to) the local preview.
    };
    recorderRef.current = rec;
    rec.start(1000); // 1s timeslices -> periodic ondataavailable
    setElapsed(0);
    setPhase('recording');
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, [stopAllTracks]);

  const pauseResume = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state === 'recording') {
      rec.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('paused');
    } else if (rec.state === 'paused') {
      rec.resume();
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      setPhase('recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (recorded) URL.revokeObjectURL(recorded.url);
    setRecorded(null);
    setElapsed(0);
    setPhase('idle');
  }, [recorded]);

  const download = useCallback(() => {
    if (!recorded) return;
    const a = document.createElement('a');
    a.href = recorded.url;
    a.download = `tutorial-${Date.now()}.${recorded.ext}`;
    a.click();
  }, [recorded]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllTracks();
    };
  }, [stopAllTracks]);

  const live = phase === 'ready' || phase === 'recording' || phase === 'paused';

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* ...header + UI omitted for brevity in this excerpt; see notes below... */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        {error && <div className="mb-4 ...">{error}</div>}

        {/* Source videos feeding the canvas. NOTE: these MUST stay rendered —
            Safari will not decode/paint a display:none (`hidden`) video, which
            makes drawImage pull black frames. Keep them tiny + near-zero opacity. */}
        <video ref={screenVideoRef} muted playsInline autoPlay className="pointer-events-none absolute top-0 left-0 w-px h-px opacity-[0.01] -z-10" />
        <video ref={camVideoRef} muted playsInline autoPlay className="pointer-events-none absolute top-0 left-0 w-px h-px opacity-[0.01] -z-10" />

        <div className="rounded-2xl overflow-hidden bg-black">
          {live ? (
            // render the canvas at the captured screen's TRUE aspect ratio so
            // nothing (incl. the corner bubble) is clipped in the preview
            <canvas ref={canvasRef} className="w-full h-auto block" />
          ) : phase === 'recorded' && recorded ? (
            <video src={recorded.url} controls className="w-full max-h-[70vh] block" />
          ) : (
            <div className="aspect-video grid place-items-center ...">Start capture…</div>
          )}
        </div>

        {/* controls: Start capture / Record / Pause-Resume + timer / Stop /
            Download + Record another; plus a "Webcam bubble" checkbox bound to camOn */}
      </main>
    </div>
  );
}
```

> The UI/JSX is trimmed in this excerpt to keep the doc focused on the mechanics.
> The full, working JSX (buttons, timer, states, browser-guidance footer) is in
> the source file — copy it verbatim and restyle. The **logic above is complete.**

---

## 4. Hard-won gotchas (read these — each one cost a debugging cycle)

1. **`display:none` breaks Safari.** Hidden source `<video>` elements must stay
   in the render tree. Safari won't decode/paint a `display:none` video, so
   `drawImage` yields **black frames**. Keep them `position:absolute`, ~1px,
   `opacity:0.01`, behind everything. Chrome tolerates `display:none`; Safari does
   not.

2. **`requestAnimationFrame` pauses in background tabs.** Switch tabs and the
   canvas stops compositing → the recording freezes/blacks. **Drive the draw loop
   from a Web Worker `setInterval`** (workers aren't tab-throttled). This is in
   the code above (`startTicker`).

3. **Safari suspends *capture itself* in background tabs.** Even with the worker
   fix, Safari can black out the source camera/screen when its tab loses focus —
   a Safari policy no code overrides. Practical rule shipped in the UI:
   **Chrome/Edge = record any window/tab and switch away freely; Safari = share
   the whole screen.** For a reliable recorder, steer users to Chrome.

4. **Forcing a square webcam (`640x640`) zooms/crops the face.** Request native
   landscape (`width:{ideal:1280}, height:{ideal:720}`) so it's a head-and-
   shoulders shot; then center-crop to a square for the circle. A forced square
   makes the browser zoom in and the circle clips the face.

5. **Preview aspect ratio clips the bubble.** Don't force the preview container to
   16:9 with the canvas cropping to it — on a taller screen the bottom (where the
   bubble lives) gets cut *in the preview* (the recorded file was fine). Render
   the live canvas at its natural aspect: `<canvas className="w-full h-auto" />`.

6. **Codec / iOS playback.** Browser recordings are often **WebM**, which
   **iOS Safari cannot play** from a `<video>`. Two options: (a) record MP4 where
   supported (MP4-first mime list), or (b) **transcode server-side** (Cloudflare
   Stream / Mux) so it plays everywhere. For a public, phone-watched library,
   transcoding is the robust answer — see Publish pipeline.

7. **Release the camera.** On stop AND unmount, `.stop()` every track and stop the
   worker/rAF, or the camera light stays on.

8. **Object URLs leak.** `URL.createObjectURL` for preview → `revokeObjectURL` on
   re-record/unmount.

9. **`getDisplayMedia`/`getUserMedia` need a secure context** (https or
   localhost) and a user gesture. Call from a click handler.

---

## 5. Browser support

| Capability | Chrome/Edge | Safari | Firefox |
|---|---|---|---|
| `getDisplayMedia` screen | yes | whole-screen reliable; single window/tab flaky | yes |
| Record while tab backgrounded | yes (with worker ticker) | unreliable (suspends capture) | mostly |
| `MediaRecorder` MP4 | recent versions | yes (H.264) | WebM only |
| `canvas.captureStream` | yes | yes | yes |
| `MediaStreamTrackProcessor` (WebCodecs compositing) | yes | **no** | partial |

**How production apps dodge Safari:** they don't composite in a backgrounded
canvas. They either record the raw screen stream directly (survives backgrounding
everywhere) and add the webcam bubble **server-side** or as a **player overlay**,
or they ship a **desktop app / browser extension** (Loom). The WebCodecs-in-a-
Worker path is Chrome-only. If you need baked-in bubbles that work in Safari
across tab switches, composite server-side rather than in the browser.

---

## 6. Adapting: webcam-only variant (no screen capture)

If the other app only needs a **talking-head webcam recording** (no screen):

- Delete everything `display*` / `getDisplayMedia`.
- You can skip the canvas entirely and record the raw `getUserMedia` stream
  directly with `MediaRecorder` (simpler, and it survives backgrounding since
  there's no rAF/canvas dependency). Keep the canvas ONLY if you want a baked-in
  **circular** talking-head — then reuse `drawFrame`'s bubble-drawing branch as
  the whole frame and keep the worker ticker.
- Keep: mime-type selection, mic capture, pause/resume, timer, preview/download,
  track cleanup, object-URL revocation.
- Mirror the preview (`transform: scaleX(-1)`) for a natural selfie view.

---

## 7. Integration points in the host app

**Auth / routing (this app's specifics — adapt to yours).** The page lives at
`/admin/tutorials/record` behind an admin session; the route prefix is added to a
middleware deny-list so only admins reach it. A local-only `/admin/dev-login`
mints a session for testing and hard-404s in production. Your app will have its
own auth — just gate the recorder route.

**Hand-off hook.** Replace the local download with an `onRecorded({ blob, type,
durationSec })` callback (or inline the upload in `rec.onstop`). The blob is the
finished file; everything downstream (upload, DB row) is host-app concern.

---

## 8. Publish pipeline (planned Phase 2/3 — recommended design)

Storing/serving video is the real work; recording is the easy half.

- **Do NOT** commit videos to the repo or POST them through a serverless function
  (Vercel has a ~4.5 MB request-body limit).
- **Direct-to-service upload.** Use a video host with a **one-time direct-upload
  URL** so the browser uploads straight to them, bypassing your server:
  **Cloudflare Stream** (cheap, includes player + thumbnails + HLS/MP4 for all
  devices — chosen here) or **Mux** (nicer DX + analytics, pricier). This also
  **solves the iOS/WebM problem** — they transcode to universal MP4/HLS.
  1. Server route asks the service for a direct-upload URL (needs an API token +
     account id in env).
  2. Browser `PUT`s the recorded blob to that URL.
  3. Poll/webhook until the asset is "ready"; get a playback id + thumbnail.
  4. Create your app's "resource"/"video" record storing the **player embed** and
     thumbnail — not the raw file.
- **Player-side overlay alternative** (fully cross-browser, no server compositing,
  no codec worries): record the raw **screen** stream directly + a separate
  **camera** clip, store both, and have the *player* position the camera bubble
  over the screen with CSS. The downloaded file won't have the bubble, but on-site
  playback does, and it works in Safari across tab switches.

---

## 9. File map (as built here)

- `src/app/admin/tutorials/record/page.tsx` — the recorder (Section 3).
- `src/middleware.ts` — route guard (added `/admin/tutorials` etc. to admin-only).
- `src/app/admin/page.tsx` — dashboard card linking to the recorder.
- `src/app/admin/dev-login/route.ts` — local-only session mint for testing
  (404s in production).

That's the whole feature. Recording is done and solid in Chrome; the publish
pipeline (Section 8) is the remaining build.
