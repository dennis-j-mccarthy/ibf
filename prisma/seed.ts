import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const faqs = [
  {
    question: 'Find a Book Fair Near You!',
    answer: 'Contact us to find out about upcoming book fairs in your area or inquire about hosting one at your school or parish.',
    order: 1,
  },
  {
    question: 'Why did Ave Maria University and Ignatius Press start book fairs?',
    answer: 'Ave Maria University and Ignatius Press partnered to create Ignatius Book Fairs to provide schools and parishes with access to quality literature that aligns with Christian values. In a landscape dominated by mainstream distributors, we offer an alternative that ensures children discover books that edify their minds, shape their character, and deepen their faith.',
    order: 2,
  },
  {
    question: "What's the process if I want to host a book fair?",
    answer: "It's simple! Submit a request form on our website, and one of our Book Fair Pros will contact you to discuss the details. We'll help you choose dates, prepare materials, and ensure your fair is a success.",
    order: 3,
  },
  {
    question: 'Where can a fair be hosted?',
    answer: 'Book fairs can be hosted at Catholic schools, Christian schools, public schools, charter schools, parishes, homeschool groups, and other organizations. We work with any group that wants to provide quality literature to their community.',
    order: 4,
  },
  {
    question: 'Are your book fairs in-person?',
    answer: 'Yes, we offer in-person book fairs where we ship books to your location. We also offer virtual book fair options for smaller organizations or those who prefer an online experience.',
    order: 5,
  },
];

const resources = [
  {
    title: 'Book Fair Host Guide',
    description: 'Complete guide for hosting a successful book fair',
    category: 'guides',
    order: 1,
  },
  {
    title: 'Promotional Materials',
    description: 'Flyers, posters, and social media assets',
    category: 'marketing',
    order: 2,
  },
  {
    title: 'Book Catalog',
    description: 'Browse our complete selection of books',
    category: 'catalog',
    order: 3,
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.fAQ.deleteMany();
  await prisma.resource.deleteMany();

  // Seed FAQs
  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: faq,
    });
  }
  console.log(`Created ${faqs.length} FAQs`);

  // Seed Resources
  for (const resource of resources) {
    await prisma.resource.create({
      data: resource,
    });
  }
  console.log(`Created ${resources.length} Resources`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
