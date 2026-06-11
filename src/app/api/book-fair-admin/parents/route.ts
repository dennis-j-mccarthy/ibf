// Lazy-loads a classroom's parents for the invite tree. Session-gated by
// middleware AND here; the query itself verifies the classroom belongs to
// the session's school so a manipulated classroomId can't cross schools.
import { NextRequest, NextResponse } from 'next/server';
import { getParentsForClassroom } from '@/lib/book-fair-admin/queries';
import { getSession } from '@/lib/book-fair-admin/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const classroomId = Number(request.nextUrl.searchParams.get('classroomId'));
  if (!Number.isInteger(classroomId) || classroomId <= 0) {
    return NextResponse.json({ error: 'Invalid classroomId' }, { status: 400 });
  }

  try {
    const parents = await getParentsForClassroom(classroomId, session.school_id);
    if (parents === null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ parents });
  } catch (error) {
    console.error('Parents lookup failed:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
