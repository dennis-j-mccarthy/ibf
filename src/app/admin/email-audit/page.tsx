import { Metadata } from 'next';
import EmailAudit from '@/components/admin/EmailAudit';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Email Audit | IBF Admin',
  robots: { index: false, follow: false },
};

// Middleware guards /admin/*; the API routes re-check the session themselves.
export default function EmailAuditPage() {
  return <EmailAudit />;
}
