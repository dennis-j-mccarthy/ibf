'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const DISMISS_KEY = 'ibf_newsletter_dismissed_at';
const DONE_KEY = 'ibf_newsletter_subscribed';
const DISMISS_DAYS = 7;

// What subscribers get -- grounded in what the blog actually publishes.
const PERKS = [
  { icon: '📚', text: 'Book picks and reviews you can trust' },
  { icon: '🍂', text: 'Seasonal reading lists' },
  { icon: '✂️', text: 'Free printables and family reading activities' },
  { icon: '📰', text: 'Book fair news, features, and tips' },
];

export default function NewsletterPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const suppressed =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/book-fair-admin') ||
    pathname.startsWith('/dev-bfa-login');

  useEffect(() => {
    if (suppressed) return;
    // ?newsletter=1 forces the popup open immediately, ignoring prior
    // signup/dismissal -- for previewing and sharing.
    if (new URLSearchParams(window.location.search).has('newsletter')) {
      const t = setTimeout(() => setOpen(true), 0);
      return () => clearTimeout(t);
    }
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    } catch {
      /* private mode -- just show */
    }
    let shown = false;
    const show = () => {
      if (!shown) {
        shown = true;
        setOpen(true);
      }
    };
    const timer = setTimeout(show, 10_000);
    const onScroll = () => {
      const doc = document.documentElement;
      if (doc.scrollTop / (doc.scrollHeight - doc.clientHeight || 1) > 0.35) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [suppressed]);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName, source: 'popup', path: pathname, website: '' }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState('error');
        setError(d.error ?? 'Something went wrong — please try again.');
        return;
      }
      setState('done');
      try {
        localStorage.setItem(DONE_KEY, '1');
      } catch {
        /* ignore */
      }
      setTimeout(() => setOpen(false), 3500);
    } catch {
      setState('error');
      setError('Something went wrong — please try again.');
    }
  };

  if (suppressed) return null;

  return (
    <aside
      role="dialog"
      aria-label="Newsletter signup"
      className={`fixed bottom-6 right-0 z-40 w-[21rem] max-w-[calc(100vw-1.5rem)] transition-transform duration-500 ease-out ${
        open ? '-translate-x-4' : 'translate-x-full'
      }`}
    >
      <div className="rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden font-brother">
        <div className="bg-[#02176f] px-5 py-4 relative">
          <button
            aria-label="Close"
            onClick={dismiss}
            className="absolute top-2.5 right-3 w-7 h-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 text-lg leading-none"
          >
            &times;
          </button>
          <p className="text-white font-bold text-lg leading-snug pr-6">
            Sign up for the Ignatius Book Fairs email
          </p>
        </div>

        {state === 'done' ? (
          <div className="px-5 py-6 text-center">
            <p className="text-[#02176f] font-bold mb-1">You&apos;re on the list! 🎉</p>
            <p className="text-sm text-gray-600">Watch your inbox for book picks and fair news.</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <ul className="mb-4 space-y-1.5">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-start gap-2 text-sm text-[#3a3f4b]">
                  <span aria-hidden className="flex-none">{p.icon}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
            <form onSubmit={submit} className="flex flex-col gap-2">
              {/* Honeypot -- hidden from real users */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088ff]"
                />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088ff]"
                />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0088ff]"
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="h-10 rounded-lg bg-[#0088ff] hover:bg-[#0077e0] text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {state === 'sending' ? 'Signing you up…' : 'Sign me up'}
              </button>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <p className="text-[11px] text-gray-400">No spam — unsubscribe anytime.</p>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
