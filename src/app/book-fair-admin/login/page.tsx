'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestMagicLink, type LoginState } from './actions';

const initialState: LoginState = { message: null };

function LoginForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get('error') === 'link';
  const next = searchParams.get('next') ?? '';
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#f5f5f5] px-4 py-16">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm p-8">
        <h1
          className="text-[#02176f] text-2xl font-semibold mb-2"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Coordinator Login
        </h1>
        <p className="text-sm text-[#7e828f] mb-6">
          Enter the email you use for your book fair and we&apos;ll send you a sign-in link.
        </p>

        {linkError && !state.message && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            That sign-in link was invalid or has expired. Request a new one below.
          </div>
        )}

        {state.message ? (
          <div className="text-sm text-[#02176f] bg-blue-50 border border-blue-200 rounded-md px-3 py-3">
            {state.message}
          </div>
        ) : (
          <form action={formAction}>
            {/* Carries the page they were trying to reach through sign-in. */}
            {next && <input type="hidden" name="next" value={next} />}
            <label htmlFor="email" className="block text-sm text-[#02176f] mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full mb-6 px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0088ff]"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#02176f] hover:bg-[#021a85] text-white font-semibold py-2 rounded-md transition-colors disabled:opacity-60"
            >
              {pending ? 'Sending…' : 'Email me a login link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CoordinatorLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
