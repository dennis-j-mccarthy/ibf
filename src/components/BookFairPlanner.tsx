'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import type { Resource } from '@prisma/client';

type EventType = 'marketing' | 'operations';
type FairType = 'catholic-in-person' | 'catholic-virtual' | 'parish-in-person' | 'public-in-person';

interface PlannerEvent {
  id: string;
  daysFromFair: number;
  title: string;
  type: EventType;
  description: string;
  tasks: string[];
  resources: { title: string; slug: string }[];
}

const FAIR_TYPE_LABELS: Record<FairType, string> = {
  'catholic-in-person': 'Catholic In Person',
  'catholic-virtual': 'Catholic Virtual',
  'parish-in-person': 'Parish In Person',
  'public-in-person': 'Public In Person',
};

// Helper to create resource link from slug
const r = (title: string, slug: string) => ({ title, slug });

// ─── CATHOLIC IN PERSON EVENTS ───
const CATHOLIC_IN_PERSON_EVENTS: PlannerEvent[] = [
  {
    id: 'workshop-1',
    daysFromFair: -90,
    title: 'Live Workshop Series - Part 1',
    type: 'operations',
    description: 'Join the first part of our 3-part live workshop series. RSVP to receive recordings even if you can\'t attend live.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
    ],
    resources: [
      r('Book Fair Administrator Operational Guide', 'book-fair-administrator-operational-guide'),
    ],
  },
  {
    id: 'admin-account',
    daysFromFair: -80,
    title: 'Create Your Admin Account',
    type: 'operations',
    description: 'Set up your school\'s admin account to manage your book fair online.',
    tasks: [
      'Watch the admin account creation tutorial',
      'Create your admin account',
      'Familiarize yourself with the dashboard',
      'Invite teachers to create classroom accounts',
    ],
    resources: [
      r('Creating your Admin Account', 'creating-your-admin-account'),
      r('Features for Teachers', 'features-for-teachers'),
      r('How to Invite a Teacher to a Classroom', 'how-to-invite-a-teacher-to-a-classroom'),
    ],
  },
  {
    id: 'workshop-2',
    daysFromFair: -60,
    title: 'Live Workshop Series - Part 2',
    type: 'operations',
    description: 'Join the second part of our workshop series focusing on mid-planning tasks.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
    ],
    resources: [
      r('Catholic School Planning Checklist', 'catholic-school-planning-checklist'),
    ],
  },
  {
    id: 'week-6',
    daysFromFair: -42,
    title: 'Save the Date Announcement',
    type: 'marketing',
    description: 'Launch your promotional campaign with save-the-date communications across all channels.',
    tasks: [
      'Post "Save the Date for Our Book Fair" graphic on all social media channels',
      'Include book fair announcement in parish bulletin',
      'Add to weekly newsletter/email',
      'Post on school bulletin board',
      'Include start and end dates of fair',
      'Mention online shopping availability with school selection',
      'Highlight free shipping options during fair dates',
    ],
    resources: [
      r('Social Media Guide', 'social-media-guide'),
      r('Fillable Social Media Post 2', 'fillable-social-media-post-2'),
      r('Fillable Social Media Story', 'fillable-social-media-story'),
    ],
  },
  {
    id: 'week-5',
    daysFromFair: -35,
    title: 'Share Parent Account Video',
    type: 'marketing',
    description: 'Share the "How to Create a Parent Account" video to help families get started.',
    tasks: [
      'Share parent account creation video on social media',
      'Include video link in newsletter or email to parents',
      'Explain school linking benefits',
      'Remind families to select your school from dropdown',
    ],
    resources: [
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
      r('How to Share School Link with Families', 'how-to-share-school-link-with-families'),
    ],
  },
  {
    id: 'workshop-3',
    daysFromFair: -30,
    title: 'Live Workshop Series - Part 3',
    type: 'operations',
    description: 'Final workshop in the series during the month leading up to your event.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
    ],
    resources: [],
  },
  {
    id: 'week-4',
    daysFromFair: -28,
    title: 'Second Save the Date & Sneak Peek',
    type: 'marketing',
    description: 'Post another save-the-date and share a sneak peek of available titles.',
    tasks: [
      'Post save-the-date graphic reminder',
      'Remind community about fair dates',
      'Share the Bookfair Sneak Peek so families can preview titles',
      'Reinforce in-person and online shopping options',
    ],
    resources: [
      r('Bookfair Sneak Peek', 'bookfair-sneak-peek'),
      r('You Caption It - Social Media Post', 'you-caption-it-social-media-post'),
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'week-3',
    daysFromFair: -21,
    title: 'Highlight Featured Titles',
    type: 'marketing',
    description: 'Showcase specific titles from staff and teachers to build excitement.',
    tasks: [
      'Select a few titles from the website',
      'Share what you, staff, or teachers are reading',
      'Let community know these books are available in person or online',
      'Explain how all sales benefit your school',
    ],
    resources: [
      r('Bookfair Sneak Peek', 'bookfair-sneak-peek'),
      r('You Caption It: Social Media or Print Ad 1', 'you-caption-it-social-media-print-ad-1'),
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'wishlists',
    daysFromFair: -18,
    title: 'Distribute Wishlists',
    type: 'operations',
    description: 'Send student and teacher wishlists home so families can plan their purchases.',
    tasks: [
      'Print and distribute student wishlists',
      'Share teacher wishlists with staff',
      'Include wishlists in backpack flyers',
      'Post wishlist info on social media',
    ],
    resources: [
      r('Student Wishlist', 'student-wishlist'),
      r('Teacher Wishlist', 'teacher-wishlist'),
      r('Fillable Backpack Flyer 2', 'fillable-backpack-flyer-2'),
    ],
  },
  {
    id: 'week-2',
    daysFromFair: -14,
    title: 'Principal Letter & Email Campaign',
    type: 'marketing',
    description: 'Email letter home to families explaining dates, times, and purpose of the book fair.',
    tasks: [
      'Email letter home to families',
      'Include book fair dates and times',
      'Explain purpose of the book fair',
      'Send invitation from principal to community',
      'Highlight opportunities to shop in person during fair',
    ],
    resources: [
      r('Principal Parent Letter - In Person', 'principal-parent-letter-in-person'),
      r('2025 Parent Letter', '2025-parent-letter'),
    ],
  },
  {
    id: 'pulpit',
    daysFromFair: -10,
    title: 'Pulpit Announcement',
    type: 'marketing',
    description: 'Announce the upcoming book fair during Mass.',
    tasks: [
      'Share pulpit announcement script with priest/deacon',
      'Confirm announcement date(s)',
      'Include dates, purpose, and online option',
    ],
    resources: [
      r('Pulpit Announcement', 'pulpit-announcement'),
    ],
  },
  {
    id: 'book-delivery',
    daysFromFair: -7,
    title: 'Book Delivery Arrives',
    type: 'operations',
    description: 'Your books and materials will be delivered! You will receive 20-38 boxes sorted by category.',
    tasks: [
      'Receive 20-38 boxes of books and materials',
      'Check that boxes are sorted by category (Picture Books, Early Readers, Comic Books, Elementary Books, Middle School Books, Crafts and Activities, Older Readers and Adults, Seasonal Selections, Toys and Trinkets)',
      'Verify packing slips match box contents',
      'Store boxes safely until setup day',
      'Count and organize materials',
    ],
    resources: [
      r('Table Signs', 'table-signs'),
      r('Category Signs', 'category-signs'),
      r('Last Copy Tags (ink saver)', 'last-copy-tags'),
    ],
  },
  {
    id: 'week-1',
    daysFromFair: -7,
    title: 'Sneak Peek & Final Reminders',
    type: 'marketing',
    description: 'Email sneak peek flyer and distribute marketing materials around school.',
    tasks: [
      'Email link to sneak peek flyer so families can preview offerings',
      'Distribute flyers in common areas',
      'Post flyers inside school newsletter',
      'Ensure fair schedule allows ample time for browsing',
      'Remind families book fair is almost here',
    ],
    resources: [
      r('Bookfair Sneak Peek', 'bookfair-sneak-peek'),
      r('Lent Flyer - 2026', 'lent-flyer-2026'),
      r('Fillable Backpack Flyer 1', 'fillable-backpack-flyer-1'),
    ],
  },
  {
    id: 'evening-before',
    daysFromFair: -1,
    title: 'Evening Before Fair - Social Post',
    type: 'marketing',
    description: 'Post on social media the evening before to build anticipation.',
    tasks: [
      'Post social media graphic',
      'Remind families fair starts tomorrow',
      'Share fair hours and location',
      'Include online shopping link',
    ],
    resources: [
      r('Social Media Guide', 'social-media-guide'),
      r('You Caption It: Social Media Story', 'you-caption-it-social-media-story'),
    ],
  },
  {
    id: 'day-1',
    daysFromFair: 0,
    title: 'Day 1 - Reading Challenge Kickoff',
    type: 'operations',
    description: 'First day of book fair! Kick off with the Reading Challenge.',
    tasks: [
      'Set up book fair displays with table signs and category signs',
      'Brief volunteers on their roles',
      'Test POS device before doors open',
      'Introduce the Reading Challenge to families',
      'Hand out coloring sheets to younger kids',
      'Monitor inventory throughout the day',
    ],
    resources: [
      r('Reading Challenge Campaign', 'reading-challenge-campaign'),
      r('POS Device Instructions', 'pos-device-instructions'),
      r('Coloring Sheet 1', 'coloring-sheet-1'),
    ],
  },
  {
    id: 'day-2',
    daysFromFair: 1,
    title: 'Day 2 - Shopping Hours Reminder',
    type: 'marketing',
    description: 'Post on social media with shopping times and location.',
    tasks: [
      'Post social media graphic with fair hours',
      'Share in-person shopping times and location',
      'Remind about goal of getting new books for classrooms/library',
      'Mention free shipping to school during fair dates',
      'Remind families to select your school when shopping online',
    ],
    resources: [
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'day-3',
    daysFromFair: 2,
    title: 'Day 3 - Reading Recommendations',
    type: 'marketing',
    description: 'Share that reading recommendations by age and grade are available.',
    tasks: [
      'Post on social media',
      'Share that reading recommendations are available by age/grade',
      'Mention recommendations available both on-site and online',
      'Help families find books that fit their children',
    ],
    resources: [],
  },
  {
    id: 'day-4',
    daysFromFair: 3,
    title: 'Day 4 - Top Sellers',
    type: 'marketing',
    description: 'Share the five most popular titles so far.',
    tasks: [
      'Check POS device or inventory for best sellers',
      'Post the five most popular titles with your community',
      'Build excitement around what others are buying',
    ],
    resources: [],
  },
  {
    id: 'day-5',
    daysFromFair: 4,
    title: 'Day 5 - Reading Habits Post',
    type: 'marketing',
    description: 'Share tips for fostering a love of reading at home.',
    tasks: [
      'Post about "Stop, Drop and Read" habit (20 minutes daily)',
      'Suggest family reading together in same room',
      'Recommend reading to children before bed',
      'Share 5-10 minute morning devotion idea',
      'Emphasize benefits of being read to at all ages',
    ],
    resources: [],
  },
  {
    id: 'day-6',
    daysFromFair: 5,
    title: 'Day 6 - Thank You Preview',
    type: 'marketing',
    description: 'Thank community and ask for book recommendations.',
    tasks: [
      'Post thank you to everyone who stopped by',
      'Mention excitement about adding new library titles',
      'Express gratitude for purchases and support',
      'Ask families to share book recommendations in comments',
    ],
    resources: [],
  },
  {
    id: 'day-7',
    daysFromFair: 6,
    title: 'Day 7 - Last Day Push',
    type: 'marketing',
    description: 'Final day of the book fair - encourage last-minute shoppers.',
    tasks: [
      'Post that today is the last day',
      'Share progress toward goal of purchasing new books',
      'Remind about percentage of sales going back to school',
      'Express appreciation for community support',
      'Celebrate watching families find new favorites and classics',
    ],
    resources: [],
  },
];

// ─── PARISH IN PERSON EVENTS ───
const PARISH_IN_PERSON_EVENTS: PlannerEvent[] = [
  {
    id: 'workshop-1',
    daysFromFair: -90,
    title: 'Live Workshop Series - Part 1',
    type: 'operations',
    description: 'Join the first part of our 3-part live workshop series. RSVP to receive recordings even if you can\'t attend live. Invite your volunteer team to join.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
      'Review the Parish Operational Guide',
    ],
    resources: [
      r('Parish Book Fair Administrator Operational Guide', 'parish-book-fair-administrator-operational-guide'),
    ],
  },
  {
    id: 'workshop-2',
    daysFromFair: -60,
    title: 'Live Workshop Series - Part 2',
    type: 'operations',
    description: 'Join the second part of our workshop series focusing on mid-planning tasks.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
    ],
    resources: [],
  },
  {
    id: 'week-6',
    daysFromFair: -42,
    title: '6 Weeks Before — Save the Date',
    type: 'marketing',
    description: 'Post a "Save the Date" on social media, in the parish bulletin, and in your weekly newsletter or email. Include start and end dates and mention online shopping and free shipping.',
    tasks: [
      'Post "Save the Date" graphic on all social media channels',
      'Include book fair announcement in parish bulletin',
      'Add to weekly newsletter/email or bulletin board',
      'Include start and end dates of fair',
      'Mention online shopping is available — select your parish from the dropdown',
      'Mention free shipping to your office during fair dates',
    ],
    resources: [
      r('Social Media Guide', 'social-media-guide'),
      r('Fillable Social Media Post 2', 'fillable-social-media-post-2'),
      r('Fillable Social Media Story', 'fillable-social-media-story'),
    ],
  },
  {
    id: 'week-5',
    daysFromFair: -35,
    title: '5 Weeks Before — Share the Video',
    type: 'marketing',
    description: 'Share the "What Makes an Ignatius Book Fair Special" video on social media and include the link in a newsletter or email to parents. Encourage families to create a parent account and link up with your parish.',
    tasks: [
      'Share video on social media',
      'Include video link in newsletter or email to parents',
      'Encourage families to create a parent account',
      'Remind families to select your parish so purchases count toward rewards',
    ],
    resources: [
      r('What Makes an Ignatius Book Fair Special', 'what-makes-an-ignatius-book-fair-special'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'workshop-3',
    daysFromFair: -30,
    title: 'Live Workshop Series - Part 3',
    type: 'operations',
    description: 'Final workshop in the series during the month leading up to your event.',
    tasks: [
      'Watch for email invitation to workshop',
      'RSVP yes to receive recordings',
      'Invite your volunteer team to join',
      'Attend live or watch the recording',
    ],
    resources: [],
  },
  {
    id: 'week-4',
    daysFromFair: -28,
    title: '4 Weeks Before — Social Media Reminder',
    type: 'marketing',
    description: 'Post another save-the-date informational post to remind your community about the dates of the book fair.',
    tasks: [
      'Post reminder graphic on social media with fair dates',
      'Remind community about in-person and online shopping options',
    ],
    resources: [
      r('You Caption It - Social Media Post', 'you-caption-it-social-media-post'),
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'week-3',
    daysFromFair: -21,
    title: '3 Weeks Before — Staff Picks & Recommendations',
    type: 'marketing',
    description: 'Select a few titles from the website that you, your staff, or your parishioners are reading and let your community know these books are available in person or online. Explain how all sales benefit your parish.',
    tasks: [
      'Select favorite titles from the website',
      'Post staff/parishioner recommendations on social media',
      'Include in parish bulletin',
      'Explain how all purchases benefit your parish',
    ],
    resources: [
      r('Bookfair Sneak Peek', 'bookfair-sneak-peek'),
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'week-2',
    daysFromFair: -14,
    title: '2 Weeks Before — Pastor Invitation',
    type: 'marketing',
    description: 'Have the pastor send an invitation out to the community, letting them know of the opportunities to shop in person during the fair. Include a pulpit announcement.',
    tasks: [
      'Have pastor send invitation to the community',
      'Include book fair dates and in-person shopping times',
      'Share pulpit announcement script with priest/deacon',
      'Invite local parishes in the same diocese',
      'Include in school newsletter if associated with a school',
    ],
    resources: [
      r('Pulpit Announcement', 'pulpit-announcement'),
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'book-delivery',
    daysFromFair: -7,
    title: 'Book Delivery Arrives',
    type: 'operations',
    description: 'Your books and materials will be delivered! You will receive 20-38 boxes sorted by category, plus 2 payment devices, tablecloths, category signs, book stands, and posters.',
    tasks: [
      'Receive 20-38 boxes of books and materials',
      'Find box marked "Open First" — plug in payment devices to charge',
      'Find marketing box — set up tablecloths, category signs, book stands',
      'Log in to payment device and scan in boxes to load inventory',
      'Sort boxes and place in front of corresponding tables',
      'Unbox books and arrange on tables for maximum visibility',
      'Verify packing slips match box contents',
    ],
    resources: [
      r('POS Device Instructions', 'pos-device-instructions'),
      r('Table Signs', 'table-signs'),
      r('Category Signs', 'category-signs'),
      r('Last Copy Tags (ink saver)', 'last-copy-tags'),
    ],
  },
  {
    id: 'week-1',
    daysFromFair: -7,
    title: '1 Week Before — Sneak Peek & Final Reminders',
    type: 'marketing',
    description: 'Put Sneak Peek flyers out in the narthex, or post inside the bulletin to remind families that the fair is almost here and what they can expect to see.',
    tasks: [
      'Email link to sneak peek flyer so families can preview offerings',
      'Put flyers in the narthex and common areas',
      'Post inside parish bulletin',
      'Remind families the fair is almost here',
      'Share the backpack flyer with your fair schedule',
    ],
    resources: [
      r('Bookfair Sneak Peek', 'bookfair-sneak-peek'),
      r('Fillable Backpack Flyer 1', 'fillable-backpack-flyer-1'),
    ],
  },
  {
    id: 'evening-before',
    daysFromFair: -1,
    title: 'Evening Before Fair — Social Post',
    type: 'marketing',
    description: 'Post on social media that the fair opens tomorrow. Include how to create a parent account and how orders benefit your parish.',
    tasks: [
      'Post social media graphic that fair opens tomorrow',
      'Share link to create a parent account',
      'Remind about free shipping during fair dates',
      'Share fair hours and location',
    ],
    resources: [
      r('You Caption It: Social Media Story', 'you-caption-it-social-media-story'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'day-1',
    daysFromFair: 0,
    title: 'Day 1 — Reading Challenge Kickoff',
    type: 'operations',
    description: 'First day of your parish book fair! Kick off with the Reading Challenge. Set up displays and brief volunteers.',
    tasks: [
      'Set up book fair displays with table signs and category signs',
      'Brief volunteers on their roles',
      'Test POS device before doors open',
      'Introduce the Reading Challenge to families',
      'Set up coloring sheets table for younger children',
      'Monitor inventory throughout the day',
    ],
    resources: [
      r('Reading Challenge Campaign', 'reading-challenge-campaign'),
      r('POS Device Instructions', 'pos-device-instructions'),
      r('Coloring Sheet 1', 'coloring-sheet-1'),
    ],
  },
  {
    id: 'day-2',
    daysFromFair: 1,
    title: 'Day 2 — Shopping Hours Reminder',
    type: 'marketing',
    description: 'Post on social media with shopping times and location. Remind about online shopping option.',
    tasks: [
      'Post social media graphic with fair hours',
      'Share in-person shopping times and location',
      'Remind about goal of getting new books for parish',
      'Mention free shipping to parish during fair dates',
      'Remind families to select your parish when shopping online',
    ],
    resources: [
      r('Social Media Guide', 'social-media-guide'),
    ],
  },
  {
    id: 'day-3',
    daysFromFair: 2,
    title: 'Day 3 — Reading Recommendations',
    type: 'marketing',
    description: 'Share that reading recommendations by age and grade are available both on-site and online.',
    tasks: [
      'Post on social media about reading recommendations',
      'Mention recommendations available by age and grade level',
      'Highlight both on-site and online availability',
      'Help families find books that fit their children',
    ],
    resources: [],
  },
  {
    id: 'day-4',
    daysFromFair: 3,
    title: 'Day 4 — Top Sellers',
    type: 'marketing',
    description: 'Share the five most popular titles with your parishioners so far.',
    tasks: [
      'Check POS device or inventory for best sellers',
      'Post the five most popular titles with your community',
      'Build excitement around what others are buying',
    ],
    resources: [],
  },
  {
    id: 'day-5',
    daysFromFair: 4,
    title: 'Day 5 — Foster a Love of Reading',
    type: 'marketing',
    description: 'Share tips for fostering a love of reading at home. Suggest "Stop, Drop and Read" — 20 minutes where the whole family reads together.',
    tasks: [
      'Post about "Stop, Drop and Read" habit (20 minutes daily)',
      'Suggest family reading together in same room',
      'Recommend reading to children before bed',
      'Share 5-10 minute morning devotion idea',
      'Emphasize benefits of being read to at all ages',
    ],
    resources: [],
  },
  {
    id: 'day-6',
    daysFromFair: 5,
    title: 'Day 6 — Thank You & Recommendations',
    type: 'marketing',
    description: 'Thank everyone who stopped by and ask families to share book recommendations with each other.',
    tasks: [
      'Post thank you to everyone who stopped by',
      'Mention excitement about adding new titles to parish library',
      'Express gratitude for support through purchases',
      'Ask families to share book recommendations in comments',
    ],
    resources: [],
  },
  {
    id: 'day-7',
    daysFromFair: 6,
    title: 'Day 7 — Last Day!',
    type: 'marketing',
    description: 'Today is the last day! Remind community that purchases earn a percentage of net sales back for free books for your parish.',
    tasks: [
      'Post that today is the last day',
      'Share progress toward goal of purchasing new books',
      'Remind about percentage of sales going back to parish',
      'Express appreciation for community support',
      'Celebrate watching families find new favorites and classics',
    ],
    resources: [],
  },
];

// ─── PUBLIC IN PERSON EVENTS ───
const PUBLIC_IN_PERSON_EVENTS: PlannerEvent[] = [
  {
    id: 'workshop-1',
    daysFromFair: -90,
    title: 'Training Workshop - Part 1',
    type: 'operations',
    description: 'Watch the first part of our pre-recorded training workshop for public and charter schools. Share the link with your volunteer team.',
    tasks: [
      'Look for email with workshop recording link',
      'Watch training workshop Part 1',
      'Share with your volunteer team',
      'Review the Public Operational Guide',
    ],
    resources: [
      r('Public Book Fair Administrator Operational Guide', 'public-book-fair-administrator-operational-guide'),
      r('Training Workshop - Part 1', 'training-workshop-public-part-1'),
    ],
  },
  {
    id: 'workshop-2',
    daysFromFair: -60,
    title: 'Training Workshop - Part 2',
    type: 'operations',
    description: 'Watch the second part of our pre-recorded workshop series focusing on mid-planning tasks.',
    tasks: [
      'Watch training workshop Part 2',
      'Share with your volunteer team',
      'Review operational guide for mid-planning tasks',
    ],
    resources: [
      r('Training Workshop - Part 2', 'training-workshop-public-part-2'),
    ],
  },
  {
    id: 'week-6',
    daysFromFair: -42,
    title: '6 Weeks Before — Save the Date',
    type: 'marketing',
    description: 'Post a "Save the Date" on social media, in the school bulletin, and in your weekly newsletter or email. Include start and end dates and mention online shopping and free shipping.',
    tasks: [
      'Post "Save the Date" graphic on all social media channels',
      'Include in school bulletin and weekly newsletter/email',
      'Post on school bulletin board',
      'Include start and end dates of fair',
      'Mention online shopping — select your school from the dropdown',
      'Mention free shipping to your office during fair dates',
    ],
    resources: [
      r('Public Blue Save the Date Interactive', 'public-blue-save-the-date'),
      r('Public Half Page Save Date Interactive', 'public-half-page-save-date'),
      r('Public Social Media Tips', 'public-social-media-tips'),
    ],
  },
  {
    id: 'week-5',
    daysFromFair: -35,
    title: '5 Weeks Before — Share the Video',
    type: 'marketing',
    description: 'Share the "What Makes an Ignatius Book Fair Special" video on social media and include the link in a newsletter or email to parents. Encourage families to create a parent account and link to your school.',
    tasks: [
      'Share video on social media',
      'Include video link in newsletter or email to parents',
      'Encourage families to create a parent account',
      'Remind families to select your school so purchases count toward rewards',
    ],
    resources: [
      r('What Makes an Ignatius Book Fair Special', 'what-makes-an-ignatius-book-fair-special'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'week-4',
    daysFromFair: -28,
    title: '4 Weeks Before — Social Media Reminder',
    type: 'marketing',
    description: 'Send another save-the-date informational post to remind your community about the dates of the book fair.',
    tasks: [
      'Post reminder graphic on social media with fair dates',
      'Remind community about in-person and online shopping options',
    ],
    resources: [
      r('Public Yellow Save the Date Interactive', 'public-yellow-save-the-date'),
      r('Public Social Media Tips', 'public-social-media-tips'),
    ],
  },
  {
    id: 'week-3',
    daysFromFair: -21,
    title: '3 Weeks Before — Staff Picks & Recommendations',
    type: 'marketing',
    description: 'Select a few titles from the website that you, your staff, or your teachers are reading and let your community know these books are available in person or online. Explain how all sales benefit your school.',
    tasks: [
      'Select favorite titles from the website',
      'Post staff/teacher recommendations on social media',
      'Include in school newsletter',
      'Explain how all purchases benefit your school',
    ],
    resources: [
      r('Public School Book Fair Sneak Peek', 'public-school-book-fair-sneak-peek'),
      r('Public Social Media Tips', 'public-social-media-tips'),
    ],
  },
  {
    id: 'wishlists',
    daysFromFair: -18,
    title: 'Distribute Wishlists',
    type: 'operations',
    description: 'Send student and teacher wishlists home so families can plan their purchases.',
    tasks: [
      'Print and distribute student wishlists',
      'Share teacher wishlists with staff',
      'Include wishlists in backpack flyers',
    ],
    resources: [
      r('Public Student Wishlist', 'public-student-wishlist'),
      r('Public Teacher Wishlist', 'public-teacher-wishlist'),
    ],
  },
  {
    id: 'week-2',
    daysFromFair: -14,
    title: '2 Weeks Before — Principal Letter',
    type: 'marketing',
    description: 'Have the principal send an invitation to the community, letting them know of the opportunities to shop in person during the fair.',
    tasks: [
      'Have principal send invitation to the community',
      'Include book fair dates and in-person shopping times',
      'Explain purpose of the book fair',
      'Include in school newsletter',
    ],
    resources: [
      r('Public Letter to Principal', 'public-letter-to-principal'),
      r('Coming Soon Principal Letter', 'coming-soon-principal-letter'),
    ],
  },
  {
    id: 'book-delivery',
    daysFromFair: -7,
    title: 'Book Delivery Arrives',
    type: 'operations',
    description: 'Your books and materials will be delivered! You will receive 20-38 boxes sorted by category, plus 2 payment devices, tablecloths, category signs, book stands, and posters.',
    tasks: [
      'Receive 20-38 boxes of books and materials',
      'Find box marked "Open First" — plug in payment devices to charge',
      'Find marketing box — set up tablecloths, category signs, book stands',
      'Log in to payment device and scan in boxes to load inventory',
      'Sort boxes and place in front of corresponding tables',
      'Unbox books and arrange on tables for maximum visibility',
      'Verify packing slips match box contents',
    ],
    resources: [
      r('POS Device Instructions', 'pos-device-instructions'),
      r('Public Last Copy', 'public-last-copy'),
    ],
  },
  {
    id: 'week-1',
    daysFromFair: -7,
    title: '1 Week Before — Sneak Peek & Final Reminders',
    type: 'marketing',
    description: 'Put Sneak Peek flyers out in common areas, or post inside your school newsletter to remind families the fair is almost here and what they can expect to see.',
    tasks: [
      'Email link to sneak peek flyer so families can preview offerings',
      'Put flyers in common areas around school',
      'Post inside school newsletter',
      'Remind families the fair is almost here',
    ],
    resources: [
      r('Public School Book Fair Sneak Peek', 'public-school-book-fair-sneak-peek'),
      r('Public Social Media Post', 'public-social-media-post'),
    ],
  },
  {
    id: 'evening-before',
    daysFromFair: -1,
    title: 'Evening Before Fair — Social Post',
    type: 'marketing',
    description: 'Post on social media that the fair opens tomorrow. Include how to create a parent account and how orders benefit your school.',
    tasks: [
      'Post social media graphic that fair opens tomorrow',
      'Share link to create a parent account',
      'Remind about free shipping during fair dates',
      'Share fair hours and location',
    ],
    resources: [
      r('Social - Feed the Imagination', 'social-feed-the-imagination-public'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'day-1',
    daysFromFair: 0,
    title: 'Day 1 — Reading Challenge Kickoff',
    type: 'operations',
    description: 'First day of your book fair! Kick off with a reading challenge: encourage families to commit to setting aside dedicated time to read together.',
    tasks: [
      'Set up book fair displays with table signs and category signs',
      'Brief volunteers on their roles',
      'Test POS device before doors open',
      'Introduce the Reading Challenge to families',
      'Set up coloring sheets table for younger children',
      'Monitor inventory throughout the day',
    ],
    resources: [
      r('POS Device Instructions', 'pos-device-instructions'),
      r('Coloring Sheet 1', 'coloring-sheet-1'),
    ],
  },
  {
    id: 'day-2',
    daysFromFair: 1,
    title: 'Day 2 — Shopping Hours Reminder',
    type: 'marketing',
    description: 'Post on social media with shopping times and location. Remind about online shopping option.',
    tasks: [
      'Post social media graphic with fair hours',
      'Share in-person shopping times and location',
      'Remind about goal of getting new books for classrooms and library',
      'Mention free shipping to school during fair dates',
      'Remind families to select your school when shopping online',
    ],
    resources: [
      r('Public Social Media Tips', 'public-social-media-tips'),
    ],
  },
  {
    id: 'day-3',
    daysFromFair: 2,
    title: 'Day 3 — Reading Recommendations',
    type: 'marketing',
    description: 'Share that reading recommendations by age and grade level are available both on-site and online.',
    tasks: [
      'Post on social media about reading recommendations',
      'Mention recommendations available by age and grade level',
      'Highlight both on-site and online availability',
      'Help families find books that fit their children',
    ],
    resources: [],
  },
  {
    id: 'day-4',
    daysFromFair: 3,
    title: 'Day 4 — Top Sellers',
    type: 'marketing',
    description: 'Share the five most popular titles with your community so far.',
    tasks: [
      'Check POS device or inventory for best sellers',
      'Post the five most popular titles with your community',
      'Build excitement around what others are buying',
    ],
    resources: [],
  },
  {
    id: 'day-5',
    daysFromFair: 4,
    title: 'Day 5 — Foster a Love of Reading',
    type: 'marketing',
    description: 'Share tips for fostering a love of reading at home. Suggest "Stop, Drop and Read" — 20 minutes where the whole family reads together.',
    tasks: [
      'Post about "Stop, Drop and Read" habit (20 minutes daily)',
      'Suggest family reading together in same room',
      'Recommend reading to children before bed',
      'Emphasize benefits of being read to at all ages',
    ],
    resources: [],
  },
  {
    id: 'day-6',
    daysFromFair: 5,
    title: 'Day 6 — Thank You & Recommendations',
    type: 'marketing',
    description: 'Thank everyone who stopped by and ask families to share book recommendations with each other.',
    tasks: [
      'Post thank you to everyone who stopped by',
      'Mention excitement about adding new titles to library',
      'Express gratitude for support through purchases',
      'Ask families to share book recommendations in comments',
    ],
    resources: [],
  },
  {
    id: 'day-7',
    daysFromFair: 6,
    title: 'Day 7 — Last Day!',
    type: 'marketing',
    description: 'Today is the last day! Remind community that purchases earn a percentage of net sales back for free books for your school.',
    tasks: [
      'Post that today is the last day',
      'Share progress toward goal of purchasing new books',
      'Remind about percentage of sales going back to school',
      'Express appreciation for community support',
      'Celebrate watching families find new favorites and classics',
    ],
    resources: [],
  },
];

// ─── VIRTUAL EVENTS ───
const VIRTUAL_EVENTS: PlannerEvent[] = [
  {
    id: 'week-7',
    daysFromFair: -49,
    title: '7 Weeks Before — Set Up & Invite Teachers',
    type: 'operations',
    description: 'Create your coordinator account and invite teachers to claim their classrooms, make reading recommendations, and choose titles for their wish lists.',
    tasks: [
      'Create your book fair coordinator account',
      'Invite teachers to claim their classrooms',
      'Ask teachers to add reading recommendations for their grades',
      'Ask teachers to choose titles for their classroom wish list',
      'Ensure teachers have logged in before parents start creating accounts',
    ],
    resources: [
      r('Virtual Book Fair Operational Guide', 'virtual-book-fair-operational-guide'),
      r('Creating your Admin Account', 'creating-your-admin-account'),
      r('How to Invite a Teacher to a Classroom', 'how-to-invite-a-teacher-to-a-classroom'),
    ],
  },
  {
    id: 'week-6',
    daysFromFair: -42,
    title: '6 Weeks Before — Save the Date',
    type: 'marketing',
    description: 'Post a "Save the Date" on social media, in the parish bulletin, and in your weekly newsletter or email. Include start and end dates and mention free shipping.',
    tasks: [
      'Post "Save the Date" graphic on all social media channels',
      'Include announcement in parish bulletin (if applicable)',
      'Add to weekly newsletter/email or bulletin board',
      'Mention 30% back from every sale and free shipping during fair dates',
      'Confirm teachers have logged in and created classroom wish lists',
    ],
    resources: [
      r('You Caption It - Social Media Post', 'you-caption-it-social-media-post'),
      r('Digital Catalog', 'digital-catalog'),
    ],
  },
  {
    id: 'week-5',
    daysFromFair: -35,
    title: '5 Weeks Before — Share the Video',
    type: 'marketing',
    description: 'Share the "What Makes an Ignatius Book Fair Special" video on social media and include the link in a newsletter or email to parents.',
    tasks: [
      'Share video on social media',
      'Include link in newsletter or email to parents',
      'Remind parents to create accounts and link up with your school',
      'Ensure teachers have logged in to create classroom wish lists',
    ],
    resources: [
      r('What Makes an Ignatius Book Fair Special', 'what-makes-an-ignatius-book-fair-special'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
    ],
  },
  {
    id: 'week-4',
    daysFromFair: -28,
    title: '4 Weeks Before — Social Media Reminder',
    type: 'marketing',
    description: 'Post another save-the-date informational post to remind your community about the dates of the online book fair.',
    tasks: [
      'Post reminder graphic on social media with fair dates',
      'Share digital catalog link',
    ],
    resources: [
      r('Virtual Fillable Social Media Post 1', 'virtual-fillable-social-media-post-1'),
      r('Digital Catalog', 'digital-catalog'),
    ],
  },
  {
    id: 'week-3',
    daysFromFair: -21,
    title: '3 Weeks Before — Staff Picks & Recommendations',
    type: 'marketing',
    description: 'Select a few titles from the website that you, your staff, or your children enjoy reading and share them with your community. Explain how all sales benefit your school.',
    tasks: [
      'Select favorite titles from the digital catalog',
      'Post staff/teacher recommendations on social media',
      'Explain how purchases benefit your school (30% back)',
    ],
    resources: [
      r('Digital Catalog', 'digital-catalog'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'week-2',
    daysFromFair: -14,
    title: '2 Weeks Before — Principal/Pastor Letter',
    type: 'marketing',
    description: 'Have the principal or pastor send out the letter to families with fair dates and your school link.',
    tasks: [
      'Send principal/pastor letter home to families',
      'Include fair dates and school link',
      'Explain how ordering works',
    ],
    resources: [
      r('Principal Parent Letter - Virtual', 'principal-parent-letter-virtual'),
    ],
  },
  {
    id: 'week-1',
    daysFromFair: -7,
    title: '1 Week Before — Backpack Flyer',
    type: 'marketing',
    description: 'Edit and send home the fillable backpack flyer with students. You can put it inside the catalog you receive.',
    tasks: [
      'Edit the fillable backpack flyer with your fair details',
      'Print and send home 1 per family',
      'Include in catalog if available',
    ],
    resources: [
      r('Virtual Backpack Flyer 2', 'virtual-backpack-flyer-2'),
      r('Virtual Fillable Yellow Print Flyer', 'virtual-fillable-yellow-print-flyer'),
    ],
  },
  {
    id: 'evening-before',
    daysFromFair: -1,
    title: 'Evening Before Fair',
    type: 'marketing',
    description: 'Post on social media that the fair opens tomorrow. Include how to create a parent account and how orders benefit your school.',
    tasks: [
      'Post graphic that virtual fair opens tomorrow',
      'Share link to create parent account',
      'Remind about free shipping during fair dates',
    ],
    resources: [
      r('Virtual You Caption It: Social Media or Print Ad 2', 'virtual-you-caption-it-2'),
      r('Creating a Parent Account', 'creating-a-parent-account'),
      r('How your Orders Benefit your School', 'how-your-orders-benefit-your-school'),
    ],
  },
  {
    id: 'day-1',
    daysFromFair: 0,
    title: 'Day 1 — Fair Opens! Reading Challenge',
    type: 'operations',
    description: 'Kick off your virtual book fair by introducing the Reading Challenge to your school families.',
    tasks: [
      'Verify your school\'s fair page is active',
      'Introduce the Reading Challenge to families',
      'Post on social media that fair is open',
      'Share direct link with families',
    ],
    resources: [
      r('Reading Challenge Campaign', 'reading-challenge-campaign'),
      r('Digital Catalog', 'digital-catalog'),
    ],
  },
  {
    id: 'day-2',
    daysFromFair: 1,
    title: 'Day 2 — Social Media Push',
    type: 'marketing',
    description: 'Post on social media about day 2. Remind families that purchases help your school and that free shipping is available during fair dates.',
    tasks: [
      'Post social media graphic',
      'Mention goal of getting new books for library and classrooms',
      'Remind about free shipping during fair dates',
      'Share your school\'s direct link',
    ],
    resources: [
      r('You Caption It: Social Media or Print Ad 1', 'you-caption-it-social-media-print-ad-1'),
    ],
  },
  {
    id: 'day-3',
    daysFromFair: 2,
    title: 'Day 3 — Reading Recommendations',
    type: 'marketing',
    description: 'Remind families about reading recommendations by age and grade level, and teacher wish lists.',
    tasks: [
      'Post about reading recommendations by age and grade level',
      'Mention teacher wish lists and recommendations',
      'Share link to browse the catalog',
    ],
    resources: [
      r('Digital Catalog', 'digital-catalog'),
    ],
  },
  {
    id: 'day-4',
    daysFromFair: 3,
    title: 'Day 4 — Staff Top Picks',
    type: 'marketing',
    description: 'Share your staff\'s top picks of fun, interesting, and thought-provoking books. Great picks for the family reading challenge.',
    tasks: [
      'Post staff top picks on social media',
      'Tie in with the family reading challenge',
      'Share direct link to your fair',
    ],
    resources: [
      r('You Caption It - Social Media Post', 'you-caption-it-social-media-post'),
    ],
  },
  {
    id: 'day-5',
    daysFromFair: 4,
    title: 'Day 5 — Foster a Love of Reading',
    type: 'marketing',
    description: 'Encourage families to try a "Stop, Drop and Read" habit: 20 minutes where everyone reads together.',
    tasks: [
      'Post about "Stop, Drop and Read" habit',
      'Suggest 20 minutes of family reading time',
      'Share ideas: morning routine, devotion time, or evening wind-down',
    ],
    resources: [],
  },
  {
    id: 'day-6',
    daysFromFair: 5,
    title: 'Day 6 — Thank You & Recommendations',
    type: 'marketing',
    description: 'Thank everyone who has ordered so far. Ask parents to share book recommendations with each other.',
    tasks: [
      'Thank families who have ordered',
      'Share excitement about new titles for the library',
      'Ask parents to share their own book recommendations',
    ],
    resources: [],
  },
  {
    id: 'day-7',
    daysFromFair: 6,
    title: 'Day 7 — Last Day!',
    type: 'marketing',
    description: 'Today is the last day! Remind families to place orders. Purchases earn 30% of the net sale for free books for your school.',
    tasks: [
      'Post that today is the last day to order',
      'Mention you are close to reaching your book goal',
      'Remind that purchases earn 30% back for the school',
      'Ask families to get orders in by tonight',
      'Thank your community for their support',
    ],
    resources: [
      r('You Caption It - Social Media Post', 'you-caption-it-social-media-post'),
    ],
  },
];

const EVENTS_BY_TYPE: Record<FairType, PlannerEvent[]> = {
  'catholic-in-person': CATHOLIC_IN_PERSON_EVENTS,
  'catholic-virtual': VIRTUAL_EVENTS,
  'parish-in-person': PARISH_IN_PERSON_EVENTS,
  'public-in-person': PUBLIC_IN_PERSON_EVENTS,
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export default function BookFairPlanner({ resources }: { resources: Resource[] }) {
  const [fairDate, setFairDate] = useState<Date | null>(null);
  const [fairType, setFairType] = useState<FairType | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Resource | null>(null);
  const [dateInput, setDateInput] = useState('');

  const handleSetDate = () => {
    if (dateInput && fairType) {
      const parsed = new Date(dateInput + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        setFairDate(parsed);
      }
    }
  };

  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources.forEach(r => map.set(r.slug, r));
    return map;
  }, [resources]);

  const handleResourceClick = (slug: string) => {
    const dbResource = resourceMap.get(slug);
    if (dbResource?.resourceType === 'Video') {
      setSelectedEvent(null);
      setSelectedVideo(dbResource);
    } else if (dbResource?.fileUrl) {
      window.open(dbResource.fileUrl, '_blank');
    } else {
      window.open(`/bookfair-resources?resource=${slug}`, '_blank');
    }
  };

  const plannerEvents = fairType ? EVENTS_BY_TYPE[fairType] : [];

  const eventsWithDates = useMemo(() => {
    if (!fairDate) return [];
    return plannerEvents.map(event => ({
      ...event,
      date: addDays(fairDate, event.daysFromFair),
    }));
  }, [fairDate, plannerEvents]);

  const months = useMemo(() => {
    if (!fairDate) return [];
    const earliest = plannerEvents.reduce((min, e) => Math.min(min, e.daysFromFair), 0);
    const startDate = addDays(fairDate, earliest);
    const endDate = addDays(fairDate, 30);
    const monthsArray: Date[] = [];

    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      monthsArray.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return monthsArray;
  }, [fairDate, plannerEvents]);

  const getEventsForDate = (date: Date) => {
    return eventsWithDates.filter(e =>
      e.date.toDateString() === date.toDateString()
    );
  };

  if (!fairDate) {
    return (
      <section className="bg-gradient-to-b from-[#02176f] to-[#0066ff] py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'barlo, sans-serif' }}>
              Book Fair Planning Calendar
            </h2>
            <p className="text-white/80 mb-8">
              Select your book fair type and date to generate a personalized planning calendar with marketing and operational tasks.
            </p>
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              {/* Fair Type Selection */}
              <label className="block text-left text-sm font-semibold text-gray-700 mb-3">
                What type of book fair are you running?
              </label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {(Object.entries(FAIR_TYPE_LABELS) as [FairType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFairType(key)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                      fairType === key
                        ? 'bg-[#0066ff] text-white border-[#0066ff]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#0066ff] hover:text-[#0066ff]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Date Input */}
              <label className="block text-left text-sm font-semibold text-gray-700 mb-2">
                When is your book fair?
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#0066ff] focus:outline-none text-lg"
              />
              <button
                onClick={handleSetDate}
                disabled={!dateInput || !fairType}
                className="w-full mt-4 bg-[#ff6445] hover:bg-[#e55a3d] disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-full transition-colors"
              >
                Generate My Planning Calendar
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-b from-[#02176f] to-[#0066ff] py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'barlo, sans-serif' }}>
              Your {FAIR_TYPE_LABELS[fairType!]} Planning Calendar
            </h2>
            <p className="text-white/80 mb-4">
              Book Fair Date: <span className="font-semibold text-[#00c853]">{formatFullDate(fairDate)}</span>
            </p>
            <button
              onClick={() => { setFairDate(null); setDateInput(''); }}
              className="text-white/60 hover:text-white text-sm underline"
            >
              Change date or fair type
            </button>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#ff6445]" />
              <span className="text-white text-sm">Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#00c853]" />
              <span className="text-white text-sm">Marketing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#ffc107]" />
              <span className="text-white text-sm">Book Fair Day</span>
            </div>
          </div>

          {/* Timeline View */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <h3 className="text-white font-semibold mb-4">Timeline Overview</h3>
            <div className="flex flex-wrap gap-2">
              {eventsWithDates.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`px-3 py-2 rounded-lg text-white text-sm font-medium transition-all hover:scale-105 ${
                    event.daysFromFair === 0
                      ? 'bg-[#ffc107] text-gray-900'
                      : event.type === 'operations'
                      ? 'bg-[#ff6445]'
                      : 'bg-[#00c853]'
                  }`}
                >
                  <div className="font-bold">{formatDate(event.date)}</div>
                  <div className="text-xs opacity-90 truncate max-w-[120px]">{event.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {months.map((month) => (
              <MonthCalendar
                key={month.toISOString()}
                month={month}
                fairDate={fairDate}
                getEventsForDate={getEventsForDate}
                onEventClick={setSelectedEvent}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          eventDate={addDays(fairDate, selectedEvent.daysFromFair)}
          onClose={() => setSelectedEvent(null)}
          resources={resources}
          onResourceClick={handleResourceClick}
        />
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <PlannerVideoModal
          resource={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </section>
  );
}

function MonthCalendar({
  month,
  fairDate,
  getEventsForDate,
  onEventClick,
}: {
  month: Date;
  fairDate: Date;
  getEventsForDate: (date: Date) => (PlannerEvent & { date: Date })[];
  onEventClick: (event: PlannerEvent) => void;
}) {
  const daysInMonth = getDaysInMonth(month);
  const firstDay = getFirstDayOfMonth(month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg">
      <h4 className="text-center font-bold text-[#02176f] mb-3">{getMonthName(month)}</h4>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-gray-400 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="h-8" />
        ))}
        {days.map((day) => {
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const events = getEventsForDate(date);
          const isFairDay = date.toDateString() === fairDate.toDateString();

          return (
            <button
              key={day}
              onClick={() => events.length > 0 && onEventClick(events[0])}
              disabled={events.length === 0}
              className={`h-8 w-8 mx-auto rounded-full text-sm flex items-center justify-center transition-all ${
                isFairDay
                  ? 'bg-[#ffc107] text-gray-900 font-bold ring-2 ring-[#ffc107] ring-offset-2'
                  : events.length > 0
                  ? events[0].type === 'operations'
                    ? 'bg-[#ff6445] text-white hover:scale-110 cursor-pointer'
                    : 'bg-[#00c853] text-white hover:scale-110 cursor-pointer'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventDetailModal({
  event,
  eventDate,
  onClose,
  resources,
  onResourceClick,
}: {
  event: PlannerEvent;
  eventDate: Date;
  onClose: () => void;
  resources: Resource[];
  onResourceClick: (slug: string) => void;
}) {
  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    resources.forEach(r => map.set(r.slug, r));
    return map;
  }, [resources]);
  const daysLabel = event.daysFromFair === 0
    ? 'Book Fair Day!'
    : event.daysFromFair < 0
    ? `${Math.abs(event.daysFromFair)} days before fair`
    : `${event.daysFromFair} days after fair`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 ${
          event.daysFromFair === 0
            ? 'bg-[#ffc107]'
            : event.type === 'operations'
            ? 'bg-[#ff6445]'
            : 'bg-[#00c853]'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className={`text-sm font-medium ${event.daysFromFair === 0 ? 'text-gray-700' : 'text-white/80'}`}>
            {daysLabel}
          </span>
          <h3 className={`text-2xl font-bold mt-1 ${event.daysFromFair === 0 ? 'text-gray-900' : 'text-white'}`}>
            {event.title}
          </h3>
          <p className={`text-sm mt-1 ${event.daysFromFair === 0 ? 'text-gray-700' : 'text-white/80'}`}>
            {formatFullDate(eventDate)}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">{event.description}</p>

          {/* Tasks */}
          <div className="mb-6">
            <h4 className="font-semibold text-[#02176f] mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Tasks to Complete
            </h4>
            <ul className="space-y-2">
              {event.tasks.map((task, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 text-sm">{task}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          {event.resources.length > 0 && (
            <div>
              <h4 className="font-semibold text-[#02176f] mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Related Resources
              </h4>
              <div className="space-y-2">
                {event.resources.map((eventResource, i) => {
                  const dbResource = resourceMap.get(eventResource.slug);
                  const thumb = dbResource?.thumbnail;
                  const isVideo = dbResource?.resourceType === 'Video';
                  return (
                    <button
                      key={i}
                      onClick={() => onResourceClick(eventResource.slug)}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100 cursor-pointer text-left"
                    >
                      {thumb ? (
                        <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={thumb}
                            alt={eventResource.title}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                          {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                                <svg className="w-3 h-3 text-[#ff6445] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#0066ff] flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <span className="text-sm text-[#02176f] font-medium">{eventResource.title}</span>
                      <svg className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isVideo ? "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 5l7 7-7 7"} />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlannerVideoModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  useEffect(() => {
    if (resource.embedCode?.includes('wistia-player')) {
      if (!document.querySelector('script[src*="wistia"]')) {
        const script = document.createElement('script');
        script.src = 'https://fast.wistia.com/assets/external/E-v1.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [resource.embedCode]);

  const processEmbedCode = (embedCode: string) => {
    let processed = embedCode
      .replace(/width="[^"]*"/gi, '')
      .replace(/height="[^"]*"/gi, '')
      .replace(/style="[^"]*"/gi, '')
      .replace(/<iframe/gi, '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"');
    if (processed.includes('wistia-player')) {
      processed = processed.replace(
        /<wistia-player([^>]*)>/gi,
        '<wistia-player$1 style="position:absolute;top:0;left:0;width:100%;height:100%">'
      );
    }
    return processed;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
          {resource.embedCode ? (
            <div
              className="absolute inset-0"
              dangerouslySetInnerHTML={{ __html: processEmbedCode(resource.embedCode) }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900">
              <p className="text-gray-400">Video not available</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-gradient-to-t from-black to-gray-900">
          <h3 className="text-white font-bold text-xl mb-2">{resource.title}</h3>
          {resource.description && (
            <p className="text-gray-300 text-sm leading-relaxed">{resource.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
