import prisma from '@/lib/prisma';

export async function getFAQs(options?: { pageTitle?: string; version?: string }) {
  const faqs = await prisma.fAQ.findMany({
    where: { 
      isActive: true,
      // Default to Catholic FAQs
      version: options?.version ?? 'Catholic',
      // Optionally filter by page
      ...(options?.pageTitle && { pageTitle: options.pageTitle }),
    },
    orderBy: { order: 'asc' },
  });
  return faqs;
}

export async function getResources() {
  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });
  return resources;
}

export async function getResourcesByCategory(category: string) {
  const resources = await prisma.resource.findMany({
    where: { 
      isActive: true,
      category: category,
    },
    orderBy: { order: 'asc' },
  });
  return resources;
}

export async function getBlogs(options?: { category?: string; featured?: boolean; limit?: number }) {
  const blogs = await prisma.blog.findMany({
    where: { 
      archived: false,
      ...(options?.category && { category: options.category }),
      ...(options?.featured !== undefined && { featured: options.featured }),
    },
    orderBy: { publishedAt: 'desc' },
    ...(options?.limit && { take: options.limit }),
  });
  return blogs;
}

export async function getBlogBySlug(slug: string) {
  const blog = await prisma.blog.findUnique({
    where: { slug },
  });
  return blog;
}

export async function getTestimonials(options?: { type?: string }) {
  const testimonials = await prisma.testimonial.findMany({
    where: { 
      isActive: true,
      ...(options?.type && { type: options.type }),
    },
    orderBy: { order: 'asc' },
  });
  return testimonials;
}
