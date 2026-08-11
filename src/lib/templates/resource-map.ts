// Which static fill-in-the-blank resources now have a merged equivalent in the
// template library. Used on the public resources page to point coordinators at
// the version that arrives already filled in.
//
// The public page never renders the merged letter itself: those bodies carry
// coordinator and principal names and emails from the CRM, and /resources is
// not behind auth. It links to the dashboard, where a magic-link session
// establishes which school is asking.

export const TEMPLATE_FOR_RESOURCE: Record<string, string> = {
  // Letters
  'principal-parent-letter-in-person': 'principal-parent-letter',
  'principal-parent-letter-virtual': 'principal-parent-letter',
  'public-letter-to-principal': 'principal-parent-letter-public',
  'coming-soon-principal-letter': 'save-the-date-note',
  '2025-parent-letter': 'parent-letter-short',
  'bookfair-principal-letter-flyer': 'parent-letter-short',

  // Save the date
  'public-blue-save-the-date': 'save-the-date-note',
  'public-yellow-save-the-date': 'save-the-date-note',
  'public-half-page-save-date': 'save-the-date-note',

  // Announcements
  'pulpit-announcement': 'pulpit-announcement-three-weeks',

  // Wishlists
  'student-wishlist': 'wishlist-family-ask',
  'teacher-wishlist': 'wishlist-teacher-request',
  'public-student-wishlist': 'wishlist-family-ask',
  'public-teacher-wishlist': 'wishlist-teacher-request',
};

export function templateForResource(slug: string): string | undefined {
  return TEMPLATE_FOR_RESOURCE[slug];
}
