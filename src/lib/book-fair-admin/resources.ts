// Resource hub content. Edit this array to change the cards — no component
// changes needed.
// TODO: real URLs — all hrefs are placeholders.

export type ResourceCategory = 'Promotion' | 'Setup' | 'During the fair' | 'After the fair';

export interface ResourceCard {
  title: string;
  description: string;
  href: string;
  category: ResourceCategory;
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  'Promotion',
  'Setup',
  'During the fair',
  'After the fair',
];

export const RESOURCES: ResourceCard[] = [
  {
    title: 'Promotion playbook',
    description: 'A week-by-week plan for building excitement with families and staff.',
    href: '#', // TODO: real URLs
    category: 'Promotion',
  },
  {
    title: 'Flyer & poster templates',
    description: 'Print-ready templates to send home and post around school.',
    href: '#', // TODO: real URLs
    category: 'Promotion',
  },
  {
    title: 'Social media kit',
    description: 'Ready-to-post graphics and captions for your school accounts.',
    href: '#', // TODO: real URLs
    category: 'Promotion',
  },
  {
    title: 'Coordinator setup guide',
    description: 'Everything to do before fair week, from classrooms to volunteers.',
    href: '#', // TODO: real URLs
    category: 'Setup',
  },
  {
    title: 'Inviting teachers & building wishlists',
    description: 'How teachers join, accept invites, and create classroom wishlists.',
    href: '#', // TODO: real URLs
    category: 'Setup',
  },
  {
    title: 'Room layout best practices',
    description: 'Sample floor plans and display tips for smooth shopping.',
    href: '#', // TODO: real URLs
    category: 'Setup',
  },
  {
    title: 'Volunteer quick-start',
    description: 'A one-page checklist for first-time fair volunteers.',
    href: '#', // TODO: real URLs
    category: 'During the fair',
  },
  {
    title: 'Point-of-sale basics',
    description: 'Checkout walkthrough, common questions, and troubleshooting.',
    href: '#', // TODO: real URLs
    category: 'During the fair',
  },
  {
    title: 'Ave Dollars at the fair',
    description: 'How students shop with Ave Dollars and what coordinators should know.',
    href: '#', // TODO: real URLs
    category: 'During the fair',
  },
  {
    title: 'Wrap-up checklist',
    description: 'Packing, returns, and closing out your fair the easy way.',
    href: '#', // TODO: real URLs
    category: 'After the fair',
  },
  {
    title: 'Thank-you note templates',
    description: 'Templates for thanking volunteers, teachers, and families.',
    href: '#', // TODO: real URLs
    category: 'After the fair',
  },
  {
    title: 'Planning next year’s fair',
    description: 'What to record now to make your next fair even better.',
    href: '#', // TODO: real URLs
    category: 'After the fair',
  },
];
