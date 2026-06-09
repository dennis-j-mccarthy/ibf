'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        setSubmitting(false);
        return;
      }
      // Only honor a "next" that points at a real admin sub-page; otherwise default.
      const nextParam = searchParams.get('next');
      const next =
        nextParam && nextParam.startsWith('/admin/') && nextParam !== '/admin/login'
          ? nextParam
          : '/admin/bot-knowledge';
      router.push(next);
      router.refresh();
    } catch {
      setError('Network error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1 className="font-brother text-[#02176f] text-2xl font-semibold mb-6">Admin Login</h1>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}
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
          disabled={submitting}
          className="w-full bg-[#02176f] hover:bg-[#021a85] text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
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
