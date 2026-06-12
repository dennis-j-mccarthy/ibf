'use server';

import { headers } from 'next/headers';
import { signMagicLinkToken } from '@/lib/book-fair-admin/auth';
import { sendMagicLinkEmail } from '@/lib/book-fair-admin/email';
import { getSchoolIdByAveDollarsEmail } from '@/lib/book-fair-admin/queries';
import { allowLoginAttempt } from '@/lib/book-fair-admin/rate-limit';

// Always the same response, whether or not an email was sent — prevents
// email enumeration.
const GENERIC_MESSAGE =
  'If this email is associated with a book fair coordinator account, a login link has been sent.';

export interface LoginState {
  message: string | null;
}

export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: GENERIC_MESSAGE };
  }

  const headerStore = await headers();
  const ip = (headerStore.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (!allowLoginAttempt(ip, email)) {
    return { message: GENERIC_MESSAGE };
  }

  try {
    // Authorization gate: the email must be a school's Ave $ admin.
    let schoolId = await getSchoolIdByAveDollarsEmail(email);

    // Dev-only convenience: let a test email stand in for a real Ave $ admin so
    // the dashboard can be demoed without touching production data.
    if (
      schoolId == null &&
      process.env.NODE_ENV !== 'production' &&
      email === 'dennisjmccarthy+test@gmail.com'
    ) {
      schoolId = 1363; // The Saint Constantine School
    }
    if (schoolId == null) return { message: GENERIC_MESSAGE };

    const secret = process.env.AUTH_JWT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!secret || !baseUrl) {
      console.error('AUTH_JWT_SECRET / NEXT_PUBLIC_APP_URL are not set');
      return { message: GENERIC_MESSAGE };
    }

    const token = await signMagicLinkToken(
      { bcUserId: 0, userId: 0, schoolId },
      secret
    );
    const link = `${baseUrl.replace(/\/$/, '')}/book-fair-admin/verify?token=${encodeURIComponent(token)}`;
    await sendMagicLinkEmail(email, link);
  } catch (error) {
    // Same generic message on errors too — no signal about what failed.
    console.error('Magic link request error:', error);
  }
  return { message: GENERIC_MESSAGE };
}
