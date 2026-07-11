import { redirect } from 'next/navigation';

// The old blog "Promo kit" is now unified with /admin/social (one flow for
// generating posts from a content piece OR a campaign strategy). Redirect any
// old links into the single generator with the blog preselected.
export default async function PromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/social?blogId=${encodeURIComponent(id)}`);
}
