import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { hashPassword } from '@/lib/auth/password';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sets (or resets) a username + password for the currently signed-in admin, so
// they can log in with credentials instead of (or in addition to) the magic link.
// The session minted at login is signed with the admin's allowlisted email.
export async function POST(request: NextRequest) {
  const email = await getAdminEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username, password } = await request.json();
  if (typeof username !== 'string' || username.trim().length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const passwordHash = hashPassword(password);
  try {
    await prisma.adminUser.upsert({
      where: { email },
      update: { username: username.trim(), passwordHash },
      create: { username: username.trim(), email, passwordHash },
    });
  } catch (e) {
    // Unique-constraint on username taken by a different admin.
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'That username is already taken. Pick another.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not save credentials.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
