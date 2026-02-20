import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faqId = parseInt(id, 10);

    if (isNaN(faqId)) {
      return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 });
    }

    const body = await request.json();
    const { version } = body;

    if (typeof version !== 'string') {
      return NextResponse.json({ error: 'Version must be a string' }, { status: 400 });
    }

    const updatedFaq = await prisma.fAQ.update({
      where: { id: faqId },
      data: { version },
    });

    return NextResponse.json(updatedFaq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faqId = parseInt(id, 10);

    if (isNaN(faqId)) {
      return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 });
    }

    await prisma.fAQ.delete({
      where: { id: faqId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faqId = parseInt(id, 10);

    if (isNaN(faqId)) {
      return NextResponse.json({ error: 'Invalid FAQ ID' }, { status: 400 });
    }

    const faq = await prisma.fAQ.findUnique({
      where: { id: faqId },
    });

    if (!faq) {
      return NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
    }

    return NextResponse.json(faq);
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 });
  }
}
