import type { Metadata } from 'next';
import ReviewsBrowser from '@/components/admin/ReviewsBrowser';
// Both datasets are imported HERE (server component) and passed as props so
// they travel in the auth-gated route payload, not a public static chunk --
// store reviews carry customer emails.
import { STORE_REVIEWS } from '@/data/storeReviews';
import { OUR_TAKES } from '@/data/ourTake';

export const metadata: Metadata = {
  title: 'Reviews | IBF Admin',
  robots: { index: false, follow: false },
};

export default function ReviewsPage() {
  return <ReviewsBrowser reviews={STORE_REVIEWS} takes={OUR_TAKES} />;
}
