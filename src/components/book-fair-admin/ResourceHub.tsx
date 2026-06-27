import Image from 'next/image';
import type { Resource } from '@prisma/client';
import HeaderIcon from './HeaderIcon';

const VIRTUAL_RE = /virtual/i;

function resourceLink(r: Resource): string {
  if (r.resourceType === 'Video' || !r.fileUrl || r.fileUrl === '#') {
    return `/bookfair-resources?resource=${r.slug}`;
  }
  return r.fileUrl;
}

// Highest 4-digit year mentioned in the title (0 if none) — used to pick the
// "latest" seasonal item when created dates are uniform (bulk import).
function titleYear(title: string): number {
  const years = (title.match(/20\d{2}/g) ?? []).map(Number);
  return years.length ? Math.max(...years) : 0;
}

function newestByYear(list: Resource[]): Resource | undefined {
  return [...list].sort((a, b) => titleYear(b.title) - titleYear(a.title))[0];
}

// Seasonal flyer recency (most → least recent), per the seasonal calendar.
// Lower rank = more recent. Update the order as the season turns.
const FLYER_SEASON_RANK: [RegExp, number][] = [
  [/summer/i, 1],
  [/sacramental/i, 2],
  [/lent/i, 3],
  [/christmas/i, 4],
  [/easter/i, 5],
  [/back.?to.?school|backpack/i, 6],
];

function flyerRank(title: string): number {
  for (const [re, rank] of FLYER_SEASON_RANK) if (re.test(title)) return rank;
  return 99; // unknown season → lowest priority
}

// Curate the few key resources for this fair. The detailed resources live on
// the planning calendar; here we surface only: the guide, the latest sneak
// peek, and the most recent seasonal flyer.
function keyResources(pool: Resource[]): { label: string; resource: Resource }[] {
  const out: { label: string; resource: Resource }[] = [];
  const guide = pool.find((r) => /operational guide|administrator guide/i.test(r.title));
  if (guide) out.push({ label: 'Your guide', resource: guide });

  const sneak = newestByYear(pool.filter((r) => /sneak peek/i.test(r.title)));
  if (sneak) out.push({ label: 'Latest sneak peek', resource: sneak });

  const flyers = pool.filter((r) => /flyer/i.test(r.title));
  const seasonalFlyer = [...flyers].sort((a, b) => flyerRank(a.title) - flyerRank(b.title))[0];
  if (seasonalFlyer) out.push({ label: 'Seasonal flyer', resource: seasonalFlyer });

  return out;
}

export default function ResourceHub({
  resources,
  audience,
  isVirtual = false,
}: {
  resources: Resource[];
  audience?: string;
  isVirtual?: boolean;
}) {
  const forAudience = resources.filter((r) => r.isActive && r.audience === audience);
  const base = forAudience.length > 0 ? forAudience : resources.filter((r) => r.isActive);
  const pool = base.filter((r) => {
    const v = VIRTUAL_RE.test(r.title) || VIRTUAL_RE.test(r.slug);
    return isVirtual ? v : !v;
  });

  const items = keyResources(pool);
  if (items.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h3
          className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          <HeaderIcon name="resources" />
          Key resources
        </h3>
        <span className="text-xs text-[#7e828f]">All resources are on your planning calendar</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map(({ label, resource }) => (
          <a
            key={resource.id}
            href={resourceLink(resource)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block border border-[#dddddd] rounded-lg overflow-hidden hover:border-[#0088ff] hover:shadow-sm transition-all"
          >
            <div className="relative aspect-[4/3] bg-white p-4 flex items-center justify-center">
              {resource.thumbnail && (
                <Image
                  src={resource.thumbnail}
                  alt=""
                  width={400}
                  height={300}
                  className="max-h-full max-w-full w-auto h-auto object-contain border border-[#dddddd] shadow-md"
                />
              )}
              {resource.resourceType === 'Video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#ff6445] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-[#7e828f] mb-0.5">{label}</p>
              <p className="font-semibold text-[#02176f] text-sm leading-snug line-clamp-2">
                {resource.title}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
