import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { getUpcomingFairsAllSchools } from '@/lib/book-fair-admin/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

// Middleware guarantees a valid admin session before this renders (staff-only
// sessions are redirected to /admin/fairs).
export default async function AdminDashboard() {
  const store = await cookies();
  const email = await verifySession(store.get(COOKIE_NAME)?.value, process.env.ADMIN_SESSION_SECRET ?? '');

  const [blogTotal, blogDrafts, blogQueued, botCount, tutorialCount] = await Promise.all([
    prisma.blog.count({ where: { archived: false } }).catch(() => null),
    prisma.blog.count({ where: { archived: false, publishedAt: null } }).catch(() => null),
    prisma.blog.count({ where: { starred: true } }).catch(() => null),
    prisma.botAnswer.count().catch(() => null),
    prisma.resource.count({ where: { category: 'Tutorials', isActive: true } }).catch(() => null),
  ]);
  let fairCount: number | null = null;
  try {
    fairCount = (await getUpcomingFairsAllSchools()).length;
  } catch {
    fairCount = null;
  }

  const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-US'));

  const cards = [
    {
      href: '/admin/fairs',
      title: 'Upcoming Fairs',
      desc: "Every school's upcoming book fair, color-coded by stage.",
      stat: num(fairCount),
      statLabel: 'upcoming',
      accent: '#0088ff',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75z"
        />
      ),
    },
    {
      href: '/admin/blog',
      title: 'Content generator',
      desc: 'Write, publish, and generate blog posts, promos, and newsletters.',
      stat: num(blogTotal),
      statLabel: `posts · ${num(blogDrafts)} drafts · ${num(blogQueued)} queued`,
      accent: '#00c853',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.04A5.5 5.5 0 007.5 4.5H4.5v13H8a4 4 0 014 2 4 4 0 014-2h3.5v-13H16.5A5.5 5.5 0 0012 6.04zm0 0V19"
        />
      ),
    },
    {
      href: '/admin/bot-knowledge',
      title: 'Chatbot Knowledge',
      desc: "Q&A that powers the website chatbot's answers.",
      stat: num(botCount),
      statLabel: 'answers',
      accent: '#7b61ff',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10.5h8M8 14h5M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        />
      ),
    },
    {
      href: '/admin/tutorials/record',
      title: 'Tutorials',
      desc: 'Record screen + webcam tutorials and publish them to Resources.',
      stat: num(tutorialCount),
      statLabel: 'tutorials',
      accent: '#ff6445',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Admin</h1>
          <nav className="flex items-center gap-4 text-sm">
            {email && <span className="hidden sm:inline text-white/70">{email}</span>}
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-medium transition-colors">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h2 className="font-brother text-[#02176f] text-2xl sm:text-3xl font-bold">Welcome back</h2>
          <p className="text-gray-500 mt-1">Manage the Ignatius Book Fairs site from here.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-6 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span
                  className="grid place-items-center w-11 h-11 rounded-xl"
                  style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
                    {c.icon}
                  </svg>
                </span>
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-[#02176f] group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="font-brother text-[#02176f] text-lg font-semibold mt-4">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1 flex-1">{c.desc}</p>
              <p className="mt-4 text-sm">
                <span className="font-brother text-2xl font-bold text-[#02176f]">{c.stat}</span>{' '}
                <span className="text-gray-400">{c.statLabel}</span>
              </p>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
