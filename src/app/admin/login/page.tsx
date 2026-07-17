'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const linkError = searchParams.get('error') === 'link';

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPwError(d.error || 'Invalid username or password');
        setPwBusy(false);
        return;
      }
      const next = searchParams.get('next');
      window.location.href = next && next.startsWith('/admin') ? next : '/admin';
    } catch {
      setPwError('Network error');
      setPwBusy(false);
    }
  };

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

        {!sent && (
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 text-sm">
            <button type="button" onClick={() => setMode('link')} className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'link' ? 'bg-white text-[#02176f] font-medium shadow-sm' : 'text-gray-500'}`}>Email link</button>
            <button type="button" onClick={() => setMode('password')} className={`flex-1 py-1.5 rounded-md transition-colors ${mode === 'password' ? 'bg-white text-[#02176f] font-medium shadow-sm' : 'text-gray-500'}`}>Password</button>
          </div>
        )}

        {sent ? (
          <div className="text-sm text-[#1a1b1f]">
            <div className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-3">
              If <span className="font-semibold">{email}</span> is an authorized staff member, a
              sign-in link is on its way. Open it on this device to finish signing in — it expires
              in 15 minutes.
            </div>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-[#0066ff] hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePasswordLogin}>
            {pwError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{pwError}</div>}
            <label className="block text-sm text-[#02176f] mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full mb-4 px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              required
            />
            <label className="block text-sm text-[#02176f] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full mb-6 px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              required
            />
            <button
              type="submit"
              disabled={pwBusy || !username || !password}
              className="w-full bg-[#02176f] hover:bg-[#021a85] text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-60"
            >
              {pwBusy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-xs text-[#7e828f] mt-3">Set a password under Account once signed in.</p>
          </form>
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
              Passwordless sign-in. We&rsquo;ll email a one-time link to authorized staff.
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
