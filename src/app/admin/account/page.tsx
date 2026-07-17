'use client';

import { useState } from 'react';

// Lets a signed-in admin set a username + password for credential login.
export default function AccountPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/admin/set-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || 'Could not save.');
      return;
    }
    setMsg(`Saved. You can now sign in at /admin/login with username "${username.trim()}" and your password.`);
    setPassword('');
    setConfirm('');
  };

  const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]';
  const label = 'block text-sm font-medium text-[#02176f] mb-1';

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Account</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-1">Set a login password</h2>
          <p className="text-sm text-gray-500 mb-5">Choose a username and password so you can sign in without the emailed link.</p>

          {err && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>}
          {msg && <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{msg}</div>}

          <form onSubmit={submit}>
            <label className={label}>Username</label>
            <input className={`${input} mb-4`} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="e.g. dennis" required />
            <label className={label}>New password</label>
            <input className={`${input} mb-4`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" required />
            <label className={label}>Confirm password</label>
            <input className={`${input} mb-6`} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            <button type="submit" disabled={busy} className="w-full bg-[#02176f] hover:bg-[#021a85] text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-60">
              {busy ? 'Saving…' : 'Save credentials'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
