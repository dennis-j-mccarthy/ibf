// Marketing calendar milestones, derived from the fair's start_date.
// Edit this list to change timeline content — no component changes needed.
// daysBeforeStart: positive = before the fair starts, negative = after.

export interface MarketingMilestone {
  daysBeforeStart: number;
  title: string;
  description: string;
}

export const MARKETING_MILESTONES: MarketingMilestone[] = [
  {
    daysBeforeStart: 42,
    title: 'Announce the fair to families',
    description: 'Share the fair dates in your school newsletter, website, and parent groups.',
  },
  {
    daysBeforeStart: 28,
    title: 'Send teacher invites',
    description: 'Invite every classroom teacher so families can shop their classroom wishlists.',
  },
  {
    daysBeforeStart: 14,
    title: 'Send home flyers',
    description: 'Distribute flyers and remind teachers to build their classroom wishlists.',
  },
  {
    daysBeforeStart: 7,
    title: 'Final reminder',
    description: 'Last push: social posts, morning announcements, and a reminder email to families.',
  },
  {
    daysBeforeStart: 0,
    title: 'Fair week',
    description: 'Welcome shoppers! Keep volunteers briefed and share daily highlights with families.',
  },
  {
    daysBeforeStart: -7,
    title: 'Post-fair thank-you',
    description: 'Thank families, teachers, and volunteers — and share what the school earned.',
  },
];
