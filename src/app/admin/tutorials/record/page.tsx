'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

// Phase 1 of the in-house tutorial recorder: a Loom-style screen + webcam
// recorder that composites the webcam into a circular bubble in the bottom-right
// corner. Everything here runs in the browser (getDisplayMedia + getUserMedia +
// canvas compositing + MediaRecorder) — no server or Cloudflare needed yet. The
// recorded file can be previewed and downloaded. Publishing to Cloudflare Stream
// + the Resources library comes in Phase 2.

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
  const [saveTitle, setSaveTitle] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savePct, setSavePct] = useState(0);
  const [saveError, setSaveError] = useState('');

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

  // Draw ONE composited frame (screen full-frame + circular webcam bottom-right).
  // Driven by a Web Worker timer (see startTicker) rather than requestAnimationFrame
  // so compositing — and therefore the recording — keeps running when the tab is
  // backgrounded. rAF is paused in background tabs, which would freeze/black the capture.
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

  // Start/stop the background-safe draw ticker. A Worker's setInterval keeps
  // firing when the page tab is not focused, unlike main-thread rAF/timers.
  const startTicker = useCallback(() => {
    if (tickWorkerRef.current) return;
    try {
      const src = `let t=null;onmessage=e=>{if(e.data&&e.data.type==='start'){t=setInterval(()=>postMessage(0),e.data.ms||33);}else{clearInterval(t);t=null;}};`;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
      w.onmessage = () => drawFrame();
      w.postMessage({ type: 'start', ms: 33 });
      tickWorkerRef.current = w;
    } catch {
      // Fallback: rAF (works while foregrounded even if Workers are unavailable)
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
        // webcam/mic optional — allow screen-only recordings
        cam = null;
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
    };
    recorderRef.current = rec;
    rec.start(1000);
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
    setSaveTitle('');
    setSaveState('idle');
    setSavePct(0);
    setSaveError('');
  }, [recorded]);

  const download = useCallback(() => {
    if (!recorded) return;
    const a = document.createElement('a');
    a.href = recorded.url;
    a.download = `tutorial-${Date.now()}.${recorded.ext}`;
    a.click();
  }, [recorded]);

  // Upload the recording straight to Vercel Blob (client upload — no size limit)
  // and record it in the Tutorials library.
  const saveToLibrary = useCallback(async () => {
    if (!recorded) return;
    setSaveError('');
    setSaveState('saving');
    setSavePct(0);
    try {
      const title = saveTitle.trim() || `Tutorial ${new Date().toLocaleDateString('en-US')}`;
      const safe = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tutorial';
      const blob = await upload(`tutorials/${safe}.${recorded.ext}`, recorded.blob, {
        access: 'public',
        contentType: recorded.blob.type || (recorded.ext === 'mp4' ? 'video/mp4' : 'video/webm'),
        handleUploadUrl: '/api/admin/blob-upload',
        onUploadProgress: (p) => setSavePct(Math.round(p.percentage)),
      });
      const res = await fetch('/api/admin/tutorials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url: blob.url, contentType: recorded.blob.type, size: recorded.blob.size }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Save failed (${res.status})`);
      }
      setSaveState('saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setSaveError(/not configured|BLOB_READ_WRITE_TOKEN/i.test(msg) ? msg : `Save failed: ${msg}`);
      setSaveState('idle');
    }
  }, [recorded, saveTitle]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopAllTracks();
    };
  }, [stopAllTracks]);

  const live = phase === 'ready' || phase === 'recording' || phase === 'paused';

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Record Tutorial</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
            Back to admin
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Source videos feeding the canvas. NOTE: these must stay rendered —
            Safari will not decode/paint a display:none (`hidden`) video, which
            makes drawImage pull black frames. Keep them in the layout but
            visually hidden (tiny, near-zero opacity, behind everything). */}
        <video ref={screenVideoRef} muted playsInline autoPlay className="pointer-events-none absolute top-0 left-0 w-px h-px opacity-[0.01] -z-10" />
        <video ref={camVideoRef} muted playsInline autoPlay className="pointer-events-none absolute top-0 left-0 w-px h-px opacity-[0.01] -z-10" />

        <div className="rounded-2xl overflow-hidden bg-black shadow-sm">
          {live ? (
            // render the canvas at the captured screen's true aspect ratio so
            // nothing (including the corner bubble) gets clipped in the preview
            <canvas ref={canvasRef} className="w-full h-auto block" />
          ) : phase === 'recorded' && recorded ? (
            <video src={recorded.url} controls className="w-full max-h-[70vh] block" />
          ) : (
            <div className="aspect-video grid place-items-center text-white/60 text-center px-6">
              <p className="font-brother text-lg">Screen + webcam recorder</p>
              <p className="text-sm mt-1 text-white/40">
                Start capture, pick the screen or window to share, and your camera appears as a bubble in the corner.
              </p>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {phase === 'idle' && (
            <button
              onClick={startCapture}
              className="bg-[#02176f] text-white font-medium px-5 py-2.5 rounded-lg hover:bg-[#02176f]/90 transition-colors"
            >
              Start capture
            </button>
          )}

          {phase === 'ready' && (
            <button
              onClick={startRecording}
              className="bg-red-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" /> Record
            </button>
          )}

          {(phase === 'recording' || phase === 'paused') && (
            <>
              <span className="inline-flex items-center gap-2 font-brother text-[#02176f] tabular-nums">
                <span className={`w-2.5 h-2.5 rounded-full ${phase === 'recording' ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`} />
                {fmt(elapsed)}
              </span>
              <button onClick={pauseResume} className="bg-white border border-gray-300 text-[#02176f] font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                {phase === 'recording' ? 'Pause' : 'Resume'}
              </button>
              <button onClick={stopRecording} className="bg-[#02176f] text-white font-medium px-5 py-2.5 rounded-lg hover:bg-[#02176f]/90 transition-colors">
                Stop
              </button>
            </>
          )}

          {live && (
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-gray-600 select-none">
              <input type="checkbox" checked={camOn} onChange={(e) => setCamOn(e.target.checked)} className="accent-[#02176f]" />
              Webcam bubble
            </label>
          )}

          {phase === 'recorded' && recorded && (
            <div className="w-full space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Tutorial title"
                  className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
                {saveState === 'saved' ? (
                  <a href="/admin/tutorials" className="bg-[#00c853] text-white font-medium px-5 py-2.5 rounded-lg hover:bg-[#00a843] transition-colors">
                    Saved — view library
                  </a>
                ) : (
                  <button
                    onClick={saveToLibrary}
                    disabled={saveState === 'saving'}
                    className="bg-[#7c3aed] text-white font-medium px-5 py-2.5 rounded-lg hover:bg-[#7c3aed]/90 disabled:opacity-60 transition-colors"
                  >
                    {saveState === 'saving' ? `Saving… ${savePct}%` : 'Save to library'}
                  </button>
                )}
                <button onClick={download} className="bg-white border border-gray-300 text-[#02176f] font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Download
                </button>
                <button onClick={reset} className="bg-white border border-gray-300 text-[#02176f] font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Record another
                </button>
                <a href="/admin/tutorials" className="text-sm text-[#0066ff] hover:underline ml-auto">Tutorials library</a>
              </div>
              {saveState === 'saving' && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-md">
                  <div className="h-full bg-[#7c3aed] transition-all" style={{ width: `${savePct}%` }} />
                </div>
              )}
              {recorded.ext !== 'mp4' && (
                <p className="text-xs text-amber-700">Heads up: this browser recorded WebM, not MP4 (WebM won&apos;t play on iPhones). Use Safari or a recent Chrome for MP4.</p>
              )}
              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{saveError}</p>}
            </div>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500 leading-relaxed space-y-1.5">
          <p>
            <strong className="text-gray-600">Best in Chrome or Edge:</strong> record any window or tab and freely switch
            away while you demo — the recording keeps running.
          </p>
          <p>
            <strong className="text-gray-600">In Safari:</strong> share your <strong>whole screen</strong> (Safari can&apos;t
            reliably keep capturing a single window or tab once it&apos;s in the background).
          </p>
          <p className="text-gray-400">
            Check &quot;Share audio&quot; in the picker if you want computer sound. Your microphone is captured automatically.
            Recording runs entirely in your browser until you publish.
          </p>
        </div>
      </main>
    </div>
  );
}
