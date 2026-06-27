'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const linkError = searchParams.get('error') === 'link';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const next = searchParams.get('next') ?? '';
      const res = await fetch('/api/admin/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next }),
      });
      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      // Always a generic success — the server never reveals whether the email
      // is an authorized admin.
      setSent(true);
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="font-brother text-[#02176f] text-2xl font-semibold mb-6">Admin Login</h1>

        {linkError && !sent && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            That sign-in link was invalid or expired. Request a new one below.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}

        {sent ? (
          <div className="text-sm text-[#1a1b1f]">
            <div className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-3">
              If <span className="font-semibold">{email}</span> is an authorized admin, a sign-in
              link is on its way. Open it on this device to finish signing in — it expires in
              15 minutes.
            </div>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-[#0066ff] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-[#02176f] mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@avemaria.edu"
              className="w-full mb-6 px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              required
            />
            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full bg-[#02176f] hover:bg-[#021a85] text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            <p className="text-xs text-[#7e828f] mt-3">
              Passwordless sign-in. We&rsquo;ll email a one-time link to authorized admins.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
