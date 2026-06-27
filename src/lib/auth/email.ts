// Admin magic-link email delivery via Resend. Self-contained (no
// book-fair-admin imports) so it ships wherever the admin login does.
// Requires RESEND_API_KEY and EMAIL_FROM; in non-production with neither set,
// the link is printed to the server console so login works without a provider.

export async function sendAdminMagicLinkEmail(to: string, link: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n[admin] magic link for ${to}:\n${link}\n`);
      return true;
    }
    console.error('RESEND_API_KEY / EMAIL_FROM are not set');
    return false;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #02176f; margin-bottom: 8px;">Ignatius Book Fairs</h2>
      <p style="color: #1a1b1f; font-size: 15px;">
        Click the button below to sign in to the Admin area. This link expires
        in 15 minutes and can only be used once.
      </p>
      <p style="margin: 28px 0;">
        <a href="${link}"
           style="background: #0088ff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
          Sign in to Admin
        </a>
      </p>
      <p style="color: #7e828f; font-size: 13px;">
        If you didn't request this email, you can safely ignore it.
        Need help? Call 888-771-2321.
      </p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject: 'Your Ignatius Book Fairs admin login link', html }),
    });
    if (!res.ok) {
      console.error(`Resend send failed: ${res.status}`, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (error) {
    console.error('Resend send error:', error);
    return false;
  }
}
