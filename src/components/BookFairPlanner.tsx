'use client';

import { useState, useMemo } from 'react';

type EventType = 'marketing' | 'operations';

interface PlannerEvent {
  id: string;
  daysFromFair: number;
  title: string;
  type: EventType;
  description: string;
  tasks: string[];
  resources: { title: string; url?: string }[];
}

const PLANNER_EVENTS: PlannerEvent[] = [
  {
    id: 'kickoff',
    daysFromFair: -85,
    title: 'Planning Kickoff',
    type: 'operations',
    description: 'Begin your book fair planning journey. Set goals, identify key volunteers, and establish your timeline.',
    tasks: [
      'Set book fair goals (sales target, participation rate)',
      'Identify volunteer coordinator and key helpers',
      'Reserve book fair dates with school administration',
      'Review previous year results (if applicable)',
    ],
    resources: [
      { title: 'Book Fair Administrator Guide' },
      { title: 'Planning Checklist' },
    ],
  },
  {
    id: 'materials',
    daysFromFair: -70,
    title: 'Order Marketing Materials',
    type: 'marketing',
    description: 'Order promotional materials and begin recruiting volunteers for your book fair.',
    tasks: [
      'Order flyers and promotional materials',
      'Create volunteer sign-up sheet',
      'Send initial volunteer recruitment email',
      'Book any required equipment or tables',
    ],
    resources: [
      { title: 'Flyer Templates' },
      { title: 'Volunteer Sign-Up Sheet' },
    ],
  },
  {
    id: 'announcements',
    daysFromFair: -50,
    title: 'Save-the-Date Announcements',
    type: 'marketing',
    description: 'Launch your promotional campaign with save-the-date communications and social media.',
    tasks: [
      'Send save-the-date to parents/families',
      'Post first social media announcement',
      'Add book fair to school calendar/newsletter',
      'Create classroom wish lists',
    ],
    resources: [
      { title: 'Save the Date Flyer' },
      { title: 'Social Media Templates' },
      { title: 'Teacher Wish List Form' },
    ],
  },
  {
    id: 'flyers',
    daysFromFair: -30,
    title: 'Distribute Flyers & Confirm Volunteers',
    type: 'marketing',
    description: 'Ramp up promotional efforts and finalize your volunteer schedule.',
    tasks: [
      'Send flyers home with students',
      'Confirm volunteer schedule',
      'Post promotional materials around school',
      'Send reminder to teachers about wish lists',
    ],
    resources: [
      { title: 'Parent Letter' },
      { title: 'Promotional Flyer' },
      { title: 'Volunteer Schedule Template' },
    ],
  },
  {
    id: 'training',
    daysFromFair: -7,
    title: 'Final Volunteer Training',
    type: 'operations',
    description: 'Train volunteers and coordinate final setup details for the book fair.',
    tasks: [
      'Hold volunteer training session',
      'Review POS system procedures',
      'Confirm setup and breakdown assignments',
      'Send final reminder to families',
    ],
    resources: [
      { title: 'Volunteer Training Guide' },
      { title: 'POS Instructions' },
    ],
  },
  {
    id: 'prep',
    daysFromFair: -2,
    title: 'Prepare Signage & Communications',
    type: 'operations',
    description: 'Finalize all signage and send last-minute communications to families.',
    tasks: [
      'Print and prepare all signage',
      'Send final reminder email to parents',
      'Prepare cash box and supplies',
      'Confirm book inventory arrival',
    ],
    resources: [
      { title: 'Table Signs' },
      { title: 'Category Signs' },
    ],
  },
  {
    id: 'setup',
    daysFromFair: -1,
    title: 'Setup Day',
    type: 'operations',
    description: 'Set up the book fair space and conduct final walkthrough.',
    tasks: [
      'Set up tables and displays',
      'Arrange books by category',
      'Test POS system',
      'Do final walkthrough with volunteers',
    ],
    resources: [
      { title: 'Setup Checklist' },
      { title: 'Display Guide' },
    ],
  },
  {
    id: 'fair-day',
    daysFromFair: 0,
    title: 'Book Fair Day!',
    type: 'operations',
    description: 'The big day! Execute your book fair with enthusiasm and organization.',
    tasks: [
      'Arrive early to do final prep',
      'Brief volunteers on their roles',
      'Monitor inventory throughout the day',
      'Engage with families and students',
      'Track sales and handle any issues',
    ],
    resources: [
      { title: 'Day-of Checklist' },
      { title: 'Troubleshooting Guide' },
    ],
  },
  {
    id: 'thank-you',
    daysFromFair: 1,
    title: 'Thank You Communications',
    type: 'marketing',
    description: 'Send immediate thank you messages and begin initial cleanup.',
    tasks: [
      'Send thank you email to volunteers',
      'Post thank you on social media',
      'Begin packing unsold books',
      'Secure cash and receipts',
    ],
    resources: [
      { title: 'Thank You Email Template' },
      { title: 'Social Media Thank You Post' },
    ],
  },
  {
    id: 'returns',
    daysFromFair: 4,
    title: 'Process Returns & Tally Results',
    type: 'operations',
    description: 'Process book returns and calculate initial results.',
    tasks: [
      'Process book returns',
      'Reconcile sales with inventory',
      'Calculate total sales and earnings',
      'Prepare return shipment',
    ],
    resources: [
      { title: 'Returns Process Guide' },
      { title: 'Sales Report Template' },
    ],
  },
  {
    id: 'notes',
    daysFromFair: 7,
    title: 'Send Thank You Notes & Share Results',
    type: 'marketing',
    description: 'Send formal thank you notes and share success metrics with the community.',
    tasks: [
      'Send thank you notes to key volunteers',
      'Share results with school administration',
      'Post success metrics on social media',
      'Send thank you to families for participating',
    ],
    resources: [
      { title: 'Thank You Note Templates' },
      { title: 'Results Announcement Template' },
    ],
  },
  {
    id: 'wrap-up',
    daysFromFair: 14,
    title: 'Final Wrap-Up & Lessons Learned',
    type: 'operations',
    description: 'Complete final wrap-up, document lessons learned, and submit feedback.',
    tasks: [
      'Hold debrief meeting with volunteers',
      'Document what worked and what to improve',
      'Submit feedback to Ignatius Book Fairs',
      'Archive materials for next year',
      'Celebrate your success!',
    ],
    resources: [
      { title: 'Feedback Form' },
      { title: 'Lessons Learned Template' },
    ],
  },
];

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

export default function BookFairPlanner() {
  const [fairDate, setFairDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null);
  const [dateInput, setDateInput] = useState('');

  const handleSetDate = () => {
    if (dateInput) {
      const parsed = new Date(dateInput + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        setFairDate(parsed);
      }
    }
  };

  const eventsWithDates = useMemo(() => {
    if (!fairDate) return [];
    return PLANNER_EVENTS.map(event => ({
      ...event,
      date: addDays(fairDate, event.daysFromFair),
    }));
  }, [fairDate]);

  const months = useMemo(() => {
    if (!fairDate) return [];
    const startDate = addDays(fairDate, -90);
    const endDate = addDays(fairDate, 30);
    const monthsArray: Date[] = [];

    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      monthsArray.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return monthsArray;
  }, [fairDate]);

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
              Enter your book fair date to generate a personalized planning calendar with marketing and operational tasks.
            </p>
            <div className="bg-white rounded-2xl p-8 shadow-xl">
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
                disabled={!dateInput}
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
              Your Book Fair Planning Calendar
            </h2>
            <p className="text-white/80 mb-4">
              Book Fair Date: <span className="font-semibold text-[#00c853]">{formatFullDate(fairDate)}</span>
            </p>
            <button
              onClick={() => { setFairDate(null); setDateInput(''); }}
              className="text-white/60 hover:text-white text-sm underline"
            >
              Change date
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
}: {
  event: PlannerEvent;
  eventDate: Date;
  onClose: () => void;
}) {
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
          <div>
            <h4 className="font-semibold text-[#02176f] mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Related Resources
            </h4>
            <div className="space-y-2">
              {event.resources.map((resource, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded bg-[#0066ff] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#02176f] font-medium">{resource.title}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">
              Resource links coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
