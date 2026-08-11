// The built-in template library. These ship in code so the studio and the
// coordinator dashboard have real content from day one; a Template row with the
// same slug overrides the default (see store.ts). Bodies use the markup in
// format.ts and the merge tokens in tokens.ts.
//
// Copy templates only. Printed collateral (flyers, signs, table tents) belongs
// to Sign Maker and social graphics belong to Social Posts — this library is
// the written word, wherever it gets sent.

export type TemplateKind = 'parent-letter' | 'email' | 'announcement' | 'press-release' | 'wishlist';

export const TEMPLATE_KINDS: { key: TemplateKind; label: string; blurb: string }[] = [
  { key: 'parent-letter', label: 'Letters', blurb: 'Send-home letters announcing the fair.' },
  { key: 'email', label: 'Email copy', blurb: 'Ready-to-paste announcements and reminders.' },
  { key: 'announcement', label: 'Announcements', blurb: 'Pulpit, morning announcements, and newsletter blurbs.' },
  { key: 'press-release', label: 'Press releases', blurb: 'For parish bulletins and local outlets.' },
  { key: 'wishlist', label: 'Wishlists', blurb: 'Ask teachers and families to build classroom wishlists.' },
];

// The brand photo library, minus photo-05 (the Loupio mascot cutout, which is
// transparent and reads badly in a photo frame).
export const LETTER_PHOTOS: string[] = [
  '01', '02', '03', '04', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15',
].map((n) => `/brand/photos/photo-${n}.jpg`);

export interface TemplateDef {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  // '' = every fair type; otherwise matches the dashboard's resource audience
  // ("Catholic In Person", "Public In Person", "Parish In Person").
  audience: string;
  // Email subject line, or the letter's headline.
  subject: string;
  body: string;
  heroImage: string;
  heroScript: string;
  footerImage: string;
  order: number;
}

export const DEFAULT_TEMPLATES: TemplateDef[] = [
  // ---------------- Letters ----------------
  {
    slug: 'principal-parent-letter',
    kind: 'parent-letter',
    name: 'Principal letter to families',
    description: 'The full announcement letter, with next steps, wish lists, and the incentive program.',
    audience: 'Catholic In Person',
    subject: 'Our Ignatius Book Fair is coming!',
    heroImage: '/brand/photos/photo-03.jpg',
    heroScript: 'Coming Soon!',
    footerImage: '/brand/photos/photo-12.jpg',
    order: 1,
    body: `Hello {{school_name}} families,

I am excited to share an upcoming event that promises to be both enjoyable and enriching for our students: our Ignatius Book Fair!

The Book Fair will be held {{fair_dates}} in {{fair_location}}.

- Students will shop during the school day.
- Parent shopping night for parents and other adults.
- The community is invited to shop in the evening.

The Ignatius Book Fair will offer an incredible selection of Catholic and secular works that inspire, educate, and allow our students to explore the complementary nature of faith and literature. In preparation for the Book Fair there are a few actions that need to be taken.

## Next steps
- **Create your parent account.** Support our school by shopping online before, during, and after the fair. Create an account at {{family_signup_url}}. Online purchases during the book fair dates receive free shipping to the school.
- **Volunteers needed.** Sign up to volunteer at these events on our online sign-up sheet.

## Additional highlights
- **Student wish list.** Students can browse the books and create a wish list on the first day of the fair. The wish list will go home for your review, and you can select your payment option at that time. The next day, students will visit the book fair to finalize their purchase.
- **Teacher wish list.** Our teachers will also create a wish list to build up their classroom library. Please consider donating by stopping at the Teacher Wish List table at the event, or by browsing their selections online.

## School incentive program
Our school receives rewards for every book purchased during and after the fair. Continue shopping all year long on the Ignatius Book Fairs website to help us earn free books for our school. Each purchase benefits our school, allowing us to enhance our library resources and reading programs.

Should you have any questions, please do not hesitate to contact the book fair organizer.

**Name:** {{coordinator_name}}
**Contact:** {{coordinator_email}}

Thank you for your continued support and involvement in our school activities. We look forward to seeing you at the Ignatius Book Fair and sharing the joy of reading with our students!

May God bless you,
{{principal_name}}`,
  },
  {
    slug: 'principal-parent-letter-public',
    kind: 'parent-letter',
    name: 'Principal letter to families',
    description: 'The full announcement letter for public school fairs.',
    audience: 'Public In Person',
    subject: 'Our Book Fair is coming!',
    heroImage: '/brand/photos/photo-02.jpg',
    heroScript: 'Coming Soon!',
    footerImage: '/brand/photos/photo-11.jpg',
    order: 2,
    body: `Hello {{school_name}} families,

I am excited to share an upcoming event that promises to be both enjoyable and enriching for our students: our Ignatius Book Fair!

The Book Fair will be held {{fair_dates}} in {{fair_location}}.

- Students will shop during the school day.
- Parent shopping night for parents and other adults.
- The community is invited to shop in the evening.

The Ignatius Book Fair will offer an incredible selection of books that inspire, educate, and allow our students to explore great literature. In preparation for the Book Fair there are a few actions that need to be taken.

## Next steps
- **Create your parent account.** Support our school by shopping online before, during, and after the fair. Create an account at {{family_signup_url}}. Online purchases during the book fair dates receive free shipping to the school.
- **Volunteers needed.** Sign up to volunteer at these events on our online sign-up sheet.

## Additional highlights
- **Student wish list.** Students can browse the books and create a wish list on the first day of the fair. The wish list will go home for your review, and you can select your payment option at that time.
- **Teacher wish list.** Our teachers will also create a wish list to build up their classroom library. Please consider donating at the Teacher Wish List table, or by browsing their selections online.

## School incentive program
Our school receives rewards for every book purchased during and after the fair. Continue shopping all year long to help us earn free books. Each purchase benefits our school, allowing us to enhance our library resources and reading programs.

Should you have any questions, please do not hesitate to contact the book fair organizer.

**Name:** {{coordinator_name}}
**Contact:** {{coordinator_email}}

Thank you for your continued support and involvement in our school activities. We look forward to seeing you at the Book Fair and sharing the joy of reading with our students!

Sincerely,
{{principal_name}}`,
  },
  {
    slug: 'parent-letter-short',
    kind: 'parent-letter',
    name: 'Short parent letter',
    description: 'A one-page send-home note with the online shopping steps.',
    audience: '',
    subject: 'Our book fair is almost here',
    heroImage: '/brand/photos/photo-01.jpg',
    heroScript: 'Coming Soon!',
    footerImage: '/brand/photos/photo-13.jpg',
    order: 3,
    body: `Dear Families,

We are excited to announce that {{school_name}} will be hosting an Ignatius Book Fair!

**When:** {{fair_dates}}
**Where:** {{fair_location}}

The book fair is a special opportunity to expand your home collection while also helping us earn new books for our classrooms and library. Every purchase benefits our school.

We would love to see you at the fair, but if you cannot attend, you can still participate by shopping online at {{shop_url}}.

## How to shop online
- Click the shopping link above.
- Create an account (if you do not already have one).
- Enter your child's name.
- Select your child's classroom.
- Confirm and add additional children or classrooms as needed.
- When finished, click "Get Started" to explore the book selections.

Every purchase helps our school earn new books. Thank you for your support, and we look forward to seeing you at the fair.

{{coordinator_name}}
{{school_name}}`,
  },
  {
    slug: 'save-the-date-note',
    kind: 'parent-letter',
    name: 'Save the date note',
    description: 'A short, early heads-up to send home or post before details are final.',
    audience: '',
    subject: 'Save the date: our book fair is {{fair_dates}}',
    heroImage: '/brand/photos/photo-11.jpg',
    heroScript: 'Save the Date!',
    footerImage: '/brand/photos/photo-12.jpg',
    order: 4,
    body: `Dear Families,

Mark your calendar. The Ignatius Book Fair is coming to {{school_name}}.

**When:** {{fair_dates}}
**Where:** {{fair_location}}

Ignatius Book Fairs offer a wholesome, carefully curated selection of books, fostering a love for reading and lifelong learning. Every purchase helps our school earn new books for our classrooms and library.

Full details are on the way. In the meantime, you can create your account at {{family_signup_url}} so you are ready the moment the fair opens.

We cannot wait to see you there.

{{coordinator_name}}
{{school_name}}`,
  },

  // ---------------- Email copy ----------------
  {
    slug: 'email-save-the-date',
    kind: 'email',
    name: 'Save the date',
    description: 'Short announcement email, roughly six weeks out.',
    audience: '',
    subject: 'Save the date: our book fair is {{fair_dates}}',
    heroImage: '/brand/photos/photo-02.jpg',
    heroScript: '',
    footerImage: '',
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
    heroImage: '/brand/photos/photo-12.jpg',
    heroScript: '',
    footerImage: '',
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
    slug: 'email-share-link',
    kind: 'email',
    name: 'Share the school link',
    description: 'Gets families onto the school shopping link early, before the fair opens.',
    audience: '',
    subject: 'Two minutes now, and you are set for the book fair',
    heroImage: '/brand/photos/photo-14.jpg',
    heroScript: '',
    footerImage: '',
    order: 3,
    body: `Hello {{school_name}} families,

One small favor before our book fair opens {{fair_start_date}}: create your account and connect it to our school.

It takes about two minutes at {{family_signup_url}}, and it does three things.

- Every purchase you make is credited to {{school_name}}.
- You can see and shop your child's classroom wish list.
- You are ready to check out the moment the fair opens, in person or online.

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
    heroImage: '/brand/photos/photo-08.jpg',
    heroScript: '',
    footerImage: '',
    order: 4,
    body: `Hello {{school_name}} families,

Our book fair has wrapped, and we are grateful. Thank you to every family who shopped, every volunteer who gave their time, and every teacher who brought a class through.

Because of you, new books are heading to our classrooms and library.

If you missed the fair, you can still shop year-round at {{shop_url}}, and our school continues to benefit.

With gratitude,
{{coordinator_name}}
{{school_name}}`,
  },

  // ---------------- Announcements ----------------
  {
    slug: 'pulpit-announcement-three-weeks',
    kind: 'announcement',
    name: 'Pulpit announcement: three weeks out',
    description: 'Read at the end of Mass three weekends before the fair.',
    audience: '',
    subject: 'Pulpit announcement: three weeks before the fair',
    heroImage: '',
    heroScript: '',
    footerImage: '',
    order: 1,
    body: `We are thrilled to announce that our church and school will be hosting an Ignatius Book Fair.

Join us at {{fair_location}} {{fair_dates}}, and at the parish after each Mass that weekend. This is a special opportunity to celebrate the joy of reading while supporting our school.

When you donate ten dollars, you can help add a book to our school library, with a sticker personalized "Donated by" or "In memory of" a loved one. We will ask the students to pray for you each time they see this sticker inside the cover.

Additional titles are also available online at {{shop_url}}, and each purchase, whether at the fair or online, earns Ave Dollars for our school.

We look forward to seeing you at the book fair.`,
  },
  {
    slug: 'pulpit-announcement-fair-weekend',
    kind: 'announcement',
    name: 'Pulpit announcement: fair weekend',
    description: 'Read at Mass the weekend the fair is open.',
    audience: '',
    subject: 'Pulpit announcement: the weekend of the fair',
    heroImage: '',
    heroScript: '',
    footerImage: '',
    order: 2,
    body: `Our Ignatius Book Fair is here. Make sure to stop by after Mass today.

This event is a wonderful way to share in the joy of reading while supporting {{school_name}}.

With a ten dollar donation, you can contribute a book to our school library, personalized with a "Donated by" or "In memory of" dedication. This gift is a beautiful way to enrich our students' faith-filled reading experience.

Cannot make it in person? Additional titles can be purchased online at {{shop_url}}, where each purchase supports our school.

Thank you for helping us make this event a true celebration of faith and reading.`,
  },
  {
    slug: 'morning-announcements',
    kind: 'announcement',
    name: 'Morning announcements',
    description: 'Three short scripts to read over the PA during fair week.',
    audience: '',
    subject: 'Morning announcement scripts',
    heroImage: '',
    heroScript: '',
    footerImage: '',
    order: 3,
    body: `## The week before
Good morning, {{school_name}}. Our book fair opens {{fair_start_date}} in {{fair_location}}. Start thinking about the books you want to look for, and remind your family that they can shop online too.

## Opening day
Good morning, {{school_name}}. The book fair is open! Your class will get a chance to visit and build a wish list. Bring your wish list home so your family can look it over.

## The last day
Good morning, {{school_name}}. Today is the last day of the book fair. If there is a book you have been waiting for, today is the day. Thank you for helping our school earn new books for our classrooms and library.`,
  },
  {
    slug: 'newsletter-blurb',
    kind: 'announcement',
    name: 'School newsletter blurb',
    description: 'A short paragraph to drop into a newsletter or website post.',
    audience: '',
    subject: 'Book fair newsletter blurb',
    heroImage: '',
    heroScript: '',
    footerImage: '',
    order: 4,
    body: `**Ignatius Book Fair, {{fair_dates}}**

The Ignatius Book Fair returns to {{school_name}} {{fair_dates}} in {{fair_location}}. Families are welcome to shop during fair hours, and students will visit with their class during the school day.

Every purchase earns books for our classrooms and library. Cannot make it in person? The whole fair is available online at {{shop_url}}, with purchases credited to our school.

Questions? Contact {{coordinator_name}} at {{coordinator_email}}.`,
  },

  // ---------------- Press releases ----------------
  {
    slug: 'press-release-fair',
    kind: 'press-release',
    name: 'Book fair press release',
    description: 'For the parish bulletin, school newsletter, or a local outlet.',
    audience: '',
    subject: '{{school_name}} to host Ignatius Book Fair {{fair_dates}}',
    heroImage: '',
    heroScript: '',
    footerImage: '',
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

  // ---------------- Wishlists ----------------
  {
    slug: 'wishlist-teacher-request',
    kind: 'wishlist',
    name: 'Teacher wishlist request',
    description: 'Asks teachers to build a classroom wishlist before the fair.',
    audience: '',
    subject: 'Please build your classroom wishlist before the fair',
    heroImage: '/brand/photos/photo-09.jpg',
    heroScript: '',
    footerImage: '',
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
    subject: "Shop your child's classroom wishlist",
    heroImage: '/brand/photos/photo-04.jpg',
    heroScript: '',
    footerImage: '',
    order: 2,
    body: `Hello {{school_name}} families,

Our teachers have built classroom wishlists for the book fair: the specific titles they want most for their rooms.

When you shop at {{shop_url}} and select your child's classroom, you will see that teacher's wishlist. Buying from it sends the book straight to the classroom.

It is the fastest way to make a difference for your child's teacher, and it takes one click.

Thank you for your support,
{{coordinator_name}}`,
  },
];
