import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blogId = parseInt(id, 10);

    if (isNaN(blogId)) {
      return NextResponse.json({ error: 'Invalid blog ID' }, { status: 400 });
    }

    const body = await request.json();
    const { category } = body;

    if (typeof category !== 'string') {
      return NextResponse.json({ error: 'Category must be a string' }, { status: 400 });
    }

    const updatedBlog = await prisma.blog.update({
      where: { id: blogId },
      data: { category },
    });

    return NextResponse.json(updatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    return NextResponse.json({ error: 'Failed to update blog' }, { status: 500 });
  }
}
