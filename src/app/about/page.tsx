import { Metadata } from 'next';
import AboutPageClient from '@/components/AboutPageClient';

export const metadata: Metadata = {
  title: 'About Ignatius Book Fairs | Catholic Books for Kids',
  description: 'Good books for great kids.',
};

const teamMembers = [
  { name: 'Annie Esposito', role: 'Chief Operating Officer', image: '/images/AnnieEsposito.png' },
  { name: 'Dennis McCarthy', role: 'Digital Platforms & Marketing', image: '/images/Dennis.png' },
  { name: 'Jeannette Gibbons', role: 'Accounting Manager', image: '/images/jeannette2.png' },
  { name: 'Kristin Munin', role: 'Book Fair Manager', image: '/images/Kristin-Munin.png' },
  { name: 'Amy Shaw', role: 'Book Fair Manager', image: '/images/Amy-Shaw-website-2.png' },
  { name: 'Cassandra Husak', role: 'Purchasing & Inventory', image: '/images/cassandra.png' },
  { name: 'Susan Nutt', role: 'Book Fair Pro', image: '/images/SusanNutt.jpg' },
  { name: 'Rose Trabbic', role: 'Book and Product Manager', image: '/images/RoseTrabbic.jpg' },
  { name: 'Anna Bragdon', role: 'Book List Curator', image: '/images/AnnaBragdon.jpg' },
  { name: 'Veronica Salgado', role: 'Marketing Specialist', image: '/images/veronica.png' },
  { name: 'Kim Neumaier', role: 'Book Fair Pro', image: '/images/kim.png' },
  { name: 'Alma Cue', role: 'Book Fair Pro', image: '/images/AlmaCue.jpg' },
  { name: 'Jeanette Pohl', role: 'Book Fair Pro', image: '/images/jeanette1.png' },
  { name: 'Julie DeGregoria', role: 'Book Fair Pro', image: '/images/julie-blob-3.jpg' },
  { name: 'Nick Capone', role: 'Video Production', image: '/images/Nick.png' },
  { name: "Balbina O'Brien", role: 'Graphic Design Lead', image: '/images/Balbina.png' },
];

const founders = [
  { name: 'Mark Middendorf', role: 'President, Ave Maria University', image: '/images/MarkMiddendorf.png' },
  { name: 'Fr. Joseph Fessio', role: 'Founder, Ignatius Press', image: '/images/Fessio.png' },
  { name: 'Mark Brumley', role: 'President, Ignatius Press', image: '/images/MarkBrumely-shape.png' },
];

export default function AboutPage() {
  return <AboutPageClient teamMembers={teamMembers} founders={founders} />;
}
