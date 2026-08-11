// The built-in template library. These ship in code so the studio and the
// coordinator dashboard have real content from day one; a Template row with the
// same slug overrides the default (see store.ts). Bodies use the markup in
// format.ts and the merge tokens in tokens.ts.

export type TemplateKind =
  | 'parent-letter'
  | 'email'
  | 'press-release'
  | 'wishlist'
  | 'flyer'
  | 'social-graphic';

export const TEMPLATE_KINDS: { key: TemplateKind; label: string; blurb: string; visual: boolean }[] = [
  { key: 'parent-letter', label: 'Parent letters', blurb: 'Send-home letters announcing the fair.', visual: false },
  { key: 'email', label: 'Email copy', blurb: 'Ready-to-paste email announcements and reminders.', visual: false },
  { key: 'press-release', label: 'Press releases', blurb: 'For parish bulletins and local outlets.', visual: false },
  { key: 'wishlist', label: 'Wishlists', blurb: 'Ask teachers and families to build classroom wishlists.', visual: false },
  { key: 'flyer', label: 'Flyers', blurb: 'Printable 8.5x11 flyers rendered with school details.', visual: true },
  { key: 'social-graphic', label: 'Social graphics', blurb: 'Square and story graphics for school accounts.', visual: true },
];

export interface TemplateDef {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  // '' = every fair type; otherwise matches the dashboard's resource audience
  // ("Catholic In Person", "Public In Person", "Parish In Person").
  audience: string;
  // Email subject line, or the letter's on-screen headline.
  subject: string;
  body: string;
  // Visual templates only: which /api/og renderer, and its query params. Token
  // substitution runs over every param value before the URL is built.
  route: '' | 'sign' | 'post' | 'header';
  params: Record<string, string>;
  order: number;
}

export const DEFAULT_TEMPLATES: TemplateDef[] = [
  {
    slug: 'parent-letter-catholic',
    kind: 'parent-letter',
    name: 'Parent letter',
    description: 'The classic send-home announcement, with online shopping steps.',
    audience: 'Catholic In Person',
    subject: 'Our Ignatius Book Fair is coming!',
    route: '',
    params: {},
    order: 1,
    body: `Dear Families,

We are excited to announce that {{school_name}} will be hosting an Ignatius Book Fair!

**When:** {{fair_dates}}
**Where:** {{fair_location}}

The book fair is a special opportunity to expand your home collection while also helping us earn new books for our classrooms and library. Every purchase benefits our school.

We would love to see you at the fair, but if you cannot attend, you can still participate by shopping online at {{shop_url}}.

## How to shop online for our book fair
- Click the shopping link above.
- Create an account (if you do not already have one).
- Enter your child's name.
- Select your child's classroom.
- Confirm and add additional children or classrooms as needed.
- When finished, click "Get Started" to explore the book selections.

Every purchase helps our school earn new books. Thank you for your support, and we look forward to seeing you at the fair.

God bless,
{{coordinator_name}}
{{school_name}}`,
  },
  {
    slug: 'parent-letter-public',
    kind: 'parent-letter',
    name: 'Parent letter',
    description: 'Send-home announcement for public school fairs.',
    audience: 'Public In Person',
    subject: 'Our Book Fair is coming!',
    route: '',
    params: {},
    order: 2,
    body: `Dear Families,

We are excited to announce that {{school_name}} will be hosting a book fair!

**When:** {{fair_dates}}
**Where:** {{fair_location}}

The book fair is a special opportunity to grow your home library while helping us earn new books for our classrooms and school library. Every purchase benefits our students.

We would love to see you at the fair, but if you cannot attend, you can still participate by shopping online at {{shop_url}}.

## How to shop online for our book fair
- Click the shopping link above.
- Create an account (if you do not already have one).
- Enter your child's name.
- Select your child's classroom.
- Confirm and add additional children or classrooms as needed.
- When finished, click "Get Started" to explore the book selections.

Thank you for supporting our readers. We look forward to seeing you at the fair.

Sincerely,
{{coordinator_name}}
{{school_name}}`,
  },
  {
    slug: 'principal-coming-soon-letter',
    kind: 'parent-letter',
    name: 'Coming soon letter',
    description: 'Early heads-up from the principal, with volunteer and account steps.',
    audience: '',
    subject: 'An exciting event is coming to {{school_name}}',
    route: '',
    params: {},
    order: 3,
    body: `Hello {{school_name}} families,

I am excited to share an upcoming event that promises to be both enjoyable and enriching for our students: our Ignatius Book Fair.

The book fair will be held {{fair_dates}} in {{fair_location}}.

Ignatius Book Fairs offer an incredible selection of works that inspire and educate our students. In preparation there are a few steps to take.

## Next steps
- **Create your parent account.** Support our school by shopping before, during, and after the fair at {{family_signup_url}}. Online purchases during the fair receive free shipping to the school.
- **Volunteer.** We invite you to sign up to help at the fair. Watch for our sign-up sheet in a follow-up message.
- **Mark your calendar.** The fair opens {{fair_start_date}}.

Thank you for supporting our readers.

Warmly,
{{principal_name}}
{{school_name}}`,
  },
  {
    slug: 'email-save-the-date',
    kind: 'email',
    name: 'Save the date',
    description: 'Short announcement email, roughly six weeks out.',
    audience: '',
    subject: 'Save the date: our book fair is {{fair_dates}}',
    route: '',
    params: {},
    order: 1,
    body: `Hello {{school_name}} families,

Mark your calendar. Our Ignatius Book Fair runs {{fair_dates}} in {{fair_location}}.

Books for every reader, and every purchase helps our classrooms and library grow.

You can shop online any time at {{shop_url}}. Creating your account now takes about a minute and means you are ready the moment the fair opens.

See you there,
{{coordinator_name}}`,
  },
  {
    slug: 'email-fair-week',
    kind: 'email',
    name: 'Fair week reminder',
    description: 'The final push, sent the week the fair opens.',
    audience: '',
    subject: 'The book fair opens this week',
    route: '',
    params: {},
    order: 2,
    body: `Hello {{school_name}} families,

Our book fair is here. Doors open {{fair_start_date}} in {{fair_location}}, and we are open through {{fair_end_date}}.

## A few things to know
- Students will shop during the school day with their class.
- Families are welcome to shop with their children during fair hours.
- Cannot make it in person? Shop the whole fair online at {{shop_url}}.
- Every purchase earns books for our classrooms and library.

Thank you for supporting our readers.

{{coordinator_name}}`,
  },
  {
    slug: 'email-thank-you',
    kind: 'email',
    name: 'Post-fair thank you',
    description: 'Closes the loop with families, teachers, and volunteers.',
    audience: '',
    subject: 'Thank you for a wonderful book fair',
    route: '',
    params: {},
    order: 3,
    body: `Hello {{school_name}} families,

Our book fair has wrapped, and we are grateful. Thank you to every family who shopped, every volunteer who gave their time, and every teacher who brought a class through.

Because of you, new books are heading to our classrooms and library.

If you missed the fair, you can still shop year-round at {{shop_url}}, and our school continues to benefit.

With gratitude,
{{coordinator_name}}
{{school_name}}`,
  },
  {
    slug: 'press-release-fair',
    kind: 'press-release',
    name: 'Book fair press release',
    description: 'For the parish bulletin, school newsletter, or a local outlet.',
    audience: '',
    subject: '{{school_name}} to host Ignatius Book Fair {{fair_dates}}',
    route: '',
    params: {},
    order: 1,
    body: `FOR IMMEDIATE RELEASE

## {{school_name}} to host Ignatius Book Fair

{{school_name}} will host an Ignatius Book Fair {{fair_dates}} in {{fair_location}}. The community is invited to attend.

The fair offers a curated selection of titles for readers of every age, chosen to inspire and educate. Proceeds support new books for the school's classrooms and library.

"Our book fair is one of the highlights of the year," said {{coordinator_name}}, book fair coordinator at {{school_name}}. "It puts great books in the hands of our students, and every purchase comes right back to our school."

Families who cannot attend in person can shop the fair online at {{shop_url}}, with purchases credited to the school.

For more information, contact {{coordinator_name}} at {{coordinator_email}}.

###`,
  },
  {
    slug: 'wishlist-teacher-request',
    kind: 'wishlist',
    name: 'Teacher wishlist request',
    description: 'Asks teachers to build a classroom wishlist before the fair.',
    audience: '',
    subject: 'Please build your classroom wishlist before the fair',
    route: '',
    params: {},
    order: 1,
    body: `Hello teachers,

Our book fair opens {{fair_start_date}}, and classroom wishlists are the single best way to get the books you actually want for your room.

## How it works
- Create your teacher account at {{teacher_signup_url}}.
- Browse the fair and add titles to your classroom wishlist.
- Families see your wishlist when they shop and can buy directly for your classroom.

Wishlists take about ten minutes to build and consistently bring in more books than any other approach. Please have yours ready before {{fair_start_date}}.

Thank you,
{{coordinator_name}}`,
  },
  {
    slug: 'wishlist-family-ask',
    kind: 'wishlist',
    name: 'Family wishlist ask',
    description: 'Points families at classroom wishlists during the fair.',
    audience: '',
    subject: 'Shop your child\'s classroom wishlist',
    route: '',
    params: {},
    order: 2,
    body: `Hello {{school_name}} families,

Our teachers have built classroom wishlists for the book fair: the specific titles they want most for their rooms.

When you shop at {{shop_url}} and select your child's classroom, you will see that teacher's wishlist. Buying from it sends the book straight to the classroom.

It is the fastest way to make a difference for your child's teacher, and it takes one click.

Thank you for your support,
{{coordinator_name}}`,
  },
  {
    slug: 'flyer-coming-soon',
    kind: 'flyer',
    name: 'Coming soon flyer',
    description: 'Printable 8.5x11 flyer with a QR code to the school shop link.',
    audience: '',
    subject: '',
    body: '',
    route: 'sign',
    order: 1,
    params: {
      eyebrow: 'Mark your calendar',
      headline: 'The Book Fair Is Coming!',
      sub: '{{school_name}}\n{{fair_dates}}',
      bg: '#02176f',
      h2Color: '#ffd41d',
      qr: '{{shop_url}}',
      footer: 'Scan to shop online. Every purchase supports our school.',
      curve: 'wave',
    },
  },
  {
    slug: 'flyer-open-now',
    kind: 'flyer',
    name: 'Open now flyer',
    description: 'Fair-week flyer for hallways, the office, and the fair table.',
    audience: '',
    subject: '',
    body: '',
    route: 'sign',
    order: 2,
    params: {
      eyebrow: 'Happening now',
      headline: 'Book Fair This Week!',
      sub: '{{fair_location}}\n{{fair_dates}}',
      bg: '#ff6445',
      h2Color: '#ffd41d',
      qr: '{{shop_url}}',
      footer: 'Cannot make it in? Scan to shop the whole fair online.',
      curve: 'wave2',
    },
  },
  {
    slug: 'social-announce',
    kind: 'social-graphic',
    name: 'Announcement post',
    description: 'Square graphic for Instagram and Facebook.',
    audience: '',
    subject: '',
    body: '',
    route: 'post',
    order: 1,
    params: {
      theme: 'statement',
      eyebrow: 'Save the date',
      statement: 'The Book Fair is coming to {{school_name}}',
      sub: '{{fair_dates}}',
      size: 'instagram',
      mode: 'catholic',
    },
  },
  {
    slug: 'social-story-countdown',
    kind: 'social-graphic',
    name: 'Countdown story',
    description: 'Vertical story graphic counting down to opening day.',
    audience: '',
    subject: '',
    body: '',
    route: 'post',
    order: 2,
    params: {
      theme: 'stat',
      statement: '{{days_until_fair}}',
      statLabel: 'days until our book fair',
      sub: '{{school_name}} - {{fair_dates}}',
      size: 'story',
      mode: 'catholic',
    },
  },
];
