import type { Metadata } from 'next';
import SpecReview from './SpecReview';

export const metadata: Metadata = {
  title: 'Gift Wallet Spec',
  // Internal review page on a public site: reachable by anyone with the link,
  // but kept out of search results. Not a substitute for auth.
  robots: { index: false, follow: false },
};

// No server-side data read here — the sidebar fetches comments after mount,
// so this page can prerender as static shell.
export default function GiftWalletSpecPage() {
  return <SpecReview />;
}
