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
    resources: [],
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
      { title: 'Table Signs', url: '/bookfair-resources?resource=table-signs' },
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
      { title: 'Blue Save the Date Interactive', url: '/bookfair-resources?resource=blue-save-the-date' },
      { title: 'Half Page Save Date Interactive', url: '/bookfair-resources?resource=half-page-save-date' },
      { title: 'Social Media Guide', url: '/bookfair-resources?resource=social-media-guide' },
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
      { title: 'Creating a Parent Account', url: '/bookfair-resources?resource=creating-a-parent-account' },
      { title: 'How your Orders Benefit your School', url: '/bookfair-resources?resource=how-your-orders-benefit-your-school' },
    ],
  },
  {
    id: 'week-4',
    daysFromFair: -28,
    title: 'Second Save the Date Reminder',
    type: 'marketing',
    description: 'Post another save-the-date to keep the book fair top of mind.',
    tasks: [
      'Post save-the-date graphic reminder',
      'Remind community about fair dates',
      'Reinforce in-person and online shopping options',
    ],
    resources: [
      { title: 'Yellow Save the Dates Interactive', url: '/bookfair-resources?resource=yellow-save-the-dates' },
      { title: 'Social Media Guide', url: '/bookfair-resources?resource=social-media-guide' },
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
      'Explain how all sales benefit your organization',
    ],
    resources: [
      { title: 'Bookfair Sneak Peek', url: '/bookfair-resources?resource=bookfair-sneak-peek' },
      { title: 'Social Media Guide', url: '/bookfair-resources?resource=social-media-guide' },
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
      { title: 'Principal Parent Letter - In Person', url: '/bookfair-resources?resource=principal-parent-letter-in-person' },
      { title: 'Principal Parent Letter - Virtual', url: '/bookfair-resources?resource=principal-parent-letter-virtual' },
    ],
  },
  {
    id: 'week-1',
    daysFromFair: -7,
    title: 'Sneak Peek & Final Reminders',
    type: 'marketing',
    description: 'Email sneak peek flyer and distribute marketing materials around school.',
    tasks: [
      'Email link to general flyer',
      'Email link to sneak peek flyer so families can preview offerings',
      'Distribute Sneak Peek flyers in common areas',
      'Post flyers inside school newsletter',
      'Ensure fair schedule allows ample time for browsing',
      'Remind families book fair is almost here',
    ],
    resources: [
      { title: 'Bookfair Sneak Peek', url: '/bookfair-resources?resource=bookfair-sneak-peek' },
      { title: 'Flyer', url: '/bookfair-resources?resource=flyer' },
      { title: 'Two-Page Flyer', url: '/bookfair-resources?resource=two-page-flyer' },
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
      { title: 'Social Media Guide', url: '/bookfair-resources?resource=social-media-guide' },
    ],
  },
  {
    id: 'day-1',
    daysFromFair: 0,
    title: 'Day 1 - Reading Challenge Kickoff',
    type: 'operations',
    description: 'First day of book fair! Kick off with the Reading Challenge.',
    tasks: [
      'Introduce the Reading Challenge to families',
      'Set up book fair displays',
      'Brief volunteers on their roles',
      'Monitor inventory throughout the day',
      'Engage with families and students',
    ],
    resources: [
      { title: 'Reading Challenge Campaign', url: '/bookfair-resources?resource=reading-challenge-campaign' },
      { title: 'POS Device Instructions', url: '/bookfair-resources?resource=pos-device-instructions' },
    ],
  },
  {
    id: 'day-2',
    daysFromFair: 1,
    title: 'Day 2 - Shopping Hours Reminder',
    type: 'marketing',
    description: 'Post on social media with shopping times and location.',
    tasks: [
      'Post social media graphic',
      'Share in-person shopping times and location',
      'Remind about goal of getting new books for classrooms/library',
      'Mention free shipping to school during fair dates',
      'Remind families to select your school when shopping online',
    ],
    resources: [
      { title: 'Social Media Guide', url: '/bookfair-resources?resource=social-media-guide' },
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
      'Have volunteers respond with titles they purchased/liked',
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
                <a
                  key={i}
                  href={resource.url || '#'}
                  onClick={(e) => {
                    if (resource.url) {
                      window.location.href = resource.url;
                    } else {
                      e.preventDefault();
                    }
                  }}
                  className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-colors ${
                    resource.url ? 'hover:bg-gray-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-[#0066ff] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-sm text-[#02176f] font-medium">{resource.title}</span>
                  {resource.url && (
                    <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
