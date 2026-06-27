'use client';

import { useState } from 'react';
import QrButton from './QrButton';

const VARIANTS = {
  family: {
    image: '/images/family-signup.webp' as string | null,
    title: 'Invite your families',
    description: "Share this link so families can sign up and shop your school's book fair.",
    button: 'Copy family link',
  },
  teacher: {
    image: null as string | null,
    title: 'Invite your teachers',
    description:
      'Share this link so teachers can register and build their classroom wishlists.',
    button: 'Copy teacher link',
  },
};

// Graduation-cap icon for the teacher variant (no teacher image yet).
function TeacherIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 1 8l11 5 9-4.09V14h2V8L12 3z" />
      <path d="M5 11.18v3.6c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.6l-7 3.18-7-3.18z" opacity="0.8" />
    </svg>
  );
}

export default function ShareSignupCard({
  url,
  variant,
  flat = false,
}: {
  url: string | null;
  variant: 'family' | 'teacher';
  flat?: boolean;
}) {
  const v = VARIANTS[variant];
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <section
      className={`flex flex-col h-full rounded-xl ${
        flat ? 'bg-[#f8f9fc] border border-[#eef0f5] p-5' : 'bg-white shadow-sm p-6'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        {v.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
        ) : (
          <span className="text-[#0088ff] flex-shrink-0">
            <TeacherIcon />
          </span>
        )}
        <h3
          className="text-[#02176f] text-xl font-semibold"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          {v.title}
        </h3>
      </div>
      <p className="text-sm text-[#7e828f] mb-4">{v.description}</p>

      {url ? (
        <div className="text-xs text-[#7e828f] bg-[#f5f5f5] rounded-md px-3 py-2 mb-4 break-all">
          {url}
        </div>
      ) : (
        <p className="text-xs text-[#7e828f] mb-4 italic">Your sign-up link will appear here.</p>
      )}

      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={!url}
          className="flex-1 whitespace-nowrap bg-[#0088ff] hover:bg-[#0070d8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-full py-2.5 px-4 transition-colors"
        >
          {copied ? 'Copied!' : v.button}
        </button>
        {url && <QrButton url={url} title={v.title} />}
      </div>
    </section>
  );
}
