'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// docSlug is the logical key stored on every comment row (schema default);
// DOC_PATH is where the HTML actually lives. They deliberately differ.
const DOC_SLUG = 'gift-wallet-spec';
const DOC_PATH = '/documents/ibf-ewallet-gift-flow.html';
// Titles mirror the <span class="sec-num"> headings in the HTML doc. Hardcoded
// rather than read out of the iframe so the sidebar labels itself before the
// doc finishes loading.
const SECTIONS: { id: string; title: string }[] = [
  { id: 'sec-01', title: '01 — CONTEXT' },
  { id: 'sec-02', title: '02 — END-TO-END FLOW' },
  { id: 'sec-03', title: '03 — DATA MODEL' },
  { id: 'sec-04', title: '04 — TOKEN CONTENTS' },
  { id: 'sec-05', title: '05 — STOREFRONT LANDING PAGE' },
  { id: 'sec-06', title: '06 — UI TOUCHPOINTS' },
  { id: 'sec-07', title: '07 — LIFECYCLE & SECURITY' },
  { id: 'sec-08', title: '08 — DECISIONS' },
  { id: 'sec-09', title: '09 — EXISTING SYSTEM: QA FIELD NOTES' },
];

type SpecComment = {
  id: string;
  docSlug: string;
  section: string;
  authorName: string;
  body: string;
  createdAt: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SpecReview() {
  const [comments, setComments] = useState<SpecComment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, { authorName: string; body: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Single fetch for the whole doc. Called on mount and after a successful
  // post -- never on a timer.
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/spec-comments?docSlug=${encodeURIComponent(DOC_SLUG)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setComments(await res.json());
      setLoadError(null);
    } catch {
      setLoadError('Could not load comments.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Same-origin, so once the doc is loaded just move its hash -- that scrolls
  // natively and instantly. Reassigning src would re-download and re-parse the
  // whole document, and the anchor scroll then fires against a half-laid-out
  // page and lands short. src assignment is the first-load fallback only.
  const jumpTo = (section: string) => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      // scrollIntoView rather than setting the hash: assigning the same hash
      // twice is a no-op, so a repeat jump would do nothing.
      const target = frame.contentDocument?.getElementById(section);
      if (target) {
        target.scrollIntoView();
        return;
      }
    } catch {
      // Cross-origin somehow -- fall through to the src assignment.
    }
    frame.src = `${DOC_PATH}#${section}`;
  };

  const draftFor = (section: string) => drafts[section] ?? { authorName: '', body: '' };

  const submit = async (e: React.FormEvent<HTMLFormElement>, section: string) => {
    e.preventDefault();
    const form = e.currentTarget;
    const draft = draftFor(section);
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';

    setBusy(section);
    setErrors((prev) => ({ ...prev, [section]: '' }));
    try {
      const res = await fetch('/api/spec-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docSlug: DOC_SLUG,
          section,
          authorName: draft.authorName,
          body: draft.body,
          website: honeypot,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors((prev) => ({ ...prev, [section]: data.error || 'Could not post comment.' }));
        return;
      }
      setDrafts((prev) => ({ ...prev, [section]: { authorName: '', body: '' } }));
      form.reset();
      await load();
    } catch {
      setErrors((prev) => ({ ...prev, [section]: 'Could not post comment.' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sr-wrap">
      <style>{`
        .sr-wrap {
          display: flex;
          align-items: stretch;
          gap: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #fff;
          color: #111;
        }
        .sr-doc { flex: 1 1 auto; min-width: 0; }
        .sr-doc iframe { width: 100%; min-height: 100vh; border: 0; display: block; }
        .sr-side {
          flex: 0 0 320px;
          width: 320px;
          border-left: 1px solid #ddd;
          padding: 16px;
          box-sizing: border-box;
          background: #fff;
        }
        .sr-side h2 { font-size: 15px; margin: 0 0 4px; }
        .sr-note { font-size: 12px; color: #666; margin: 0 0 16px; }
        .sr-group { border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; background: #fff; }
        .sr-sum {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          width: 100%; padding: 8px 10px; font-size: 13px; font-weight: 600;
          background: #fafafa; border: 0; border-radius: 4px; cursor: pointer; text-align: left;
        }
        .sr-count { font-weight: 400; color: #666; }
        .sr-body { padding: 10px; border-top: 1px solid #eee; }
        .sr-jump {
          font-size: 12px; padding: 4px 8px; margin-bottom: 10px;
          border: 1px solid #ccc; border-radius: 3px; background: #fff; cursor: pointer;
        }
        .sr-c { border-top: 1px solid #f0f0f0; padding: 8px 0; font-size: 13px; }
        .sr-c:first-of-type { border-top: 0; }
        .sr-meta { font-size: 11px; color: #666; margin-bottom: 2px; }
        .sr-text { white-space: pre-wrap; word-break: break-word; margin: 0; }
        .sr-empty { font-size: 12px; color: #888; margin: 0 0 8px; }
        .sr-form { border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px; }
        .sr-form input[type="text"], .sr-form textarea {
          width: 100%; box-sizing: border-box; font: inherit; font-size: 13px;
          padding: 6px; border: 1px solid #ccc; border-radius: 3px; margin-bottom: 6px;
        }
        .sr-form textarea { min-height: 64px; resize: vertical; }
        .sr-form button {
          font: inherit; font-size: 13px; padding: 6px 12px;
          border: 1px solid #ccc; border-radius: 3px; background: #f5f5f5; cursor: pointer;
        }
        .sr-form button[disabled] { opacity: .6; cursor: default; }
        .sr-err { font-size: 12px; color: #b00; margin: 6px 0 0; }
        /* Honeypot: off-screen and untabbable, but not display:none -- some
           bots skip hidden inputs, and skipping is what we want to prevent. */
        .sr-hp {
          position: absolute; left: -9999px; width: 1px; height: 1px;
          overflow: hidden; opacity: 0;
        }
        @media (max-width: 767px) {
          .sr-wrap { display: block; }
          .sr-side { width: auto; flex: none; border-left: 0; border-top: 1px solid #ddd; }
        }
      `}</style>

      <div className="sr-doc">
        <iframe ref={iframeRef} src={DOC_PATH} title="Gift Wallet spec" />
      </div>

      <aside className="sr-side">
        <h2>Review comments</h2>
        <p className="sr-note">No sign-in. Your name is shown with your comment.</p>
        {loadError && <p className="sr-err">{loadError}</p>}

        {SECTIONS.map(({ id: section, title }) => {
          const mine = comments
            .filter((c) => c.section === section)
            .slice()
            .reverse(); // API returns oldest-first; sidebar shows newest-first.
          const isOpen = !!open[section];
          const draft = draftFor(section);

          return (
            <div className="sr-group" key={section}>
              <button
                type="button"
                className="sr-sum"
                aria-expanded={isOpen}
                onClick={() => setOpen((prev) => ({ ...prev, [section]: !prev[section] }))}
              >
                <span>
                  {isOpen ? '▾' : '▸'} {title}
                </span>
                <span className="sr-count">{mine.length}</span>
              </button>

              {isOpen && (
                <div className="sr-body">
                  <button type="button" className="sr-jump" onClick={() => jumpTo(section)}>
                    Jump to section
                  </button>

                  {mine.length === 0 ? (
                    <p className="sr-empty">No comments yet.</p>
                  ) : (
                    mine.map((c) => (
                      <div className="sr-c" key={c.id}>
                        <div className="sr-meta">
                          {c.authorName} · {formatWhen(c.createdAt)}
                        </div>
                        <p className="sr-text">{c.body}</p>
                      </div>
                    ))
                  )}

                  <form className="sr-form" onSubmit={(e) => submit(e, section)}>
                    <input
                      type="text"
                      name="authorName"
                      placeholder="Your name"
                      maxLength={80}
                      required
                      value={draft.authorName}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [section]: { ...draftFor(section), authorName: e.target.value },
                        }))
                      }
                    />
                    <textarea
                      name="body"
                      placeholder="Comment"
                      maxLength={2000}
                      required
                      value={draft.body}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [section]: { ...draftFor(section), body: e.target.value },
                        }))
                      }
                    />
                    <div className="sr-hp" aria-hidden="true">
                      <label>
                        Website
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                      </label>
                    </div>
                    <button type="submit" disabled={busy === section}>
                      {busy === section ? 'Posting…' : 'Post comment'}
                    </button>
                    {errors[section] && <p className="sr-err">{errors[section]}</p>}
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </aside>
    </div>
  );
}
