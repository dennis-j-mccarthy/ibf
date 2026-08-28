import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// "Prepare for publishing": lets any admin (e.g. Kristin) flag a finished
// recording for the people who can actually publish. Emails Dennis and
// Jessica a link to the tutorials library; no PII in the email beyond the
// requester's staff address, and the link itself is login-gated.
const PUBLISHER_EMAILS = ['dennis.mccarthy@avemaria.edu', 'jessica.miano@avemaria.edu'];

export async function POST(request: NextRequest) {
  const requester = await getAdminEmail();
  if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  if (!tutorial) return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });

  const link = 'https://www.ignatiusbookfairs.com/admin/tutorials';
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[tutorials] publish request from ${requester} for "${tutorial.title}" -> ${PUBLISHER_EMAILS.join(', ')}\n${link}\n`);
      return NextResponse.json({ ok: true, dev: true });
    }
    console.error('RESEND_API_KEY / EMAIL_FROM are not set');
    return NextResponse.json({ error: 'Email is not configured' }, { status: 500 });
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #02176f; margin-bottom: 8px;">Tutorial ready to publish</h2>
      <p style="color: #1a1b1f; font-size: 15px;">
        ${esc(requester)} finished a recording and asked for it to be published
        to the public Resources page:
      </p>
      <p style="color: #02176f; font-size: 16px; font-weight: bold;">${esc(tutorial.title)}</p>
      <p style="margin: 28px 0;">
        <a href="${link}"
           style="background: #0088ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Review in the Tutorials library
        </a>
      </p>
      <p style="color: #7e828f; font-size: 13px;">
        You are receiving this because you can publish tutorials. The link
        requires an admin sign-in.
      </p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: PUBLISHER_EMAILS,
        subject: `Tutorial ready to publish: ${tutorial.title}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`Resend send failed: ${res.status}`, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }
  } catch (error) {
    console.error('Resend send error:', error);
    return NextResponse.json({ error: 'Send failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
