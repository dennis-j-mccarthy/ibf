'use client';

import { useState } from 'react';

export default function PasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/health/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'That password is not right.');
        return;
      }
      // Full reload so the server component re-runs with the new cookie.
      window.location.reload();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#fafafa] px-6 py-20">
      <div className="w-full max-w-sm rounded-2xl border border-[#e4e6ea] bg-white p-8 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7e828f]">
          Ignatius Book Fairs
        </div>
        <h1 className="text-2xl font-bold text-[#02176f]">System Health</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#7e828f]">
          This status board is shared with stakeholders. Enter the access password to continue.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="health-pw" className="sr-only">
            Access password
          </label>
          <input
            id="health-pw"
            type="password"
            autoComplete="off"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access password"
            className="w-full rounded-lg border border-[#e4e6ea] px-3 py-2.5 text-sm text-[#1a1b1f] outline-none transition focus:border-[#0088ff]"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="mt-3 w-full rounded-lg bg-[#0088ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'View status board'}
          </button>
          {error && <p className="mt-3 text-sm text-[#ff6445]">{error}</p>}
        </form>
      </div>
    </main>
  );
}
