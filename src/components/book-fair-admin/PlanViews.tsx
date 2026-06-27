'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Resource } from '@prisma/client';
import PrepChecklist from './PrepChecklist';

// The calendar is heavy, so it only loads/mounts when the Calendar view is selected.
const BookFairPlanner = dynamic(() => import('@/components/BookFairPlanner'), {
  ssr: false,
  loading: () => (
    <div className="p-12 text-center text-[#7e828f] text-sm">Loading calendar…</div>
  ),
});

interface ChecklistProps {
  schoolId: number;
  fairType: string;
  autoDone: Record<string, boolean>;
  taxCertMissing?: boolean;
  resourcesBySlug?: Record<string, Resource>;
  adminSignupUrl?: string;
  fairStartDate?: string;
}

interface PlannerProps {
  resources: Resource[];
  initialFairType?: string;
  initialFairDate?: string;
  lockSettings?: boolean;
}

export default function PlanViews({
  checklist,
  planner,
}: {
  checklist: ChecklistProps;
  planner: PlannerProps;
}) {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <PrepChecklist
      {...checklist}
      view={view}
      onViewChange={setView}
      calendar={view === 'calendar' ? <BookFairPlanner {...planner} /> : null}
    />
  );
}
