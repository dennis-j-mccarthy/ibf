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
