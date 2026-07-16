import { prisma } from '@/lib/prisma';

// The brand "training" profile + image library that inform the blog and social
// generators. One editable profile row (singleton) plus a tagged image table.

export type AudienceTraining = { audience: string; statements: string[]; angles: string[] };
export type BrandColor = { name: string; hex: string };
export type BrandFont = { name: string; usage: string };

export type TrainingProfileData = {
  audiences: AudienceTraining[];
  colors: BrandColor[];
  fonts: BrandFont[];
  socialPrefs: string;
  articlePrefs: string;
};

export type TrainingImageData = {
  id: number;
  url: string;
  alt: string;
  category: string;
  audience: string;
  tags: string[];
  source: string;
};

export const IMAGE_CATEGORIES = ['kids', 'bookfairs', 'parents', 'teachers', 'admins', 'doodads', 'other'] as const;

// Sensible starter profile so the tools have brand context before anyone edits.
const DEFAULT_PROFILE: TrainingProfileData = {
  audiences: [
    { audience: 'Parents', statements: [], angles: [] },
    { audience: 'Teachers', statements: [], angles: [] },
    { audience: 'Administrators', statements: [], angles: [] },
  ],
  colors: [
    { name: 'Ignatius Blue', hex: '#02176f' },
    { name: 'Bright Blue', hex: '#0088ff' },
  ],
  fonts: [
    { name: 'Fredoka', usage: 'Headlines & bold statements' },
    { name: 'Brother 1816', usage: 'UI / subheads' },
  ],
  socialPrefs: '',
  articlePrefs: '',
};

// Read the singleton profile, falling back to defaults when the row is absent
// (so the generators always get usable context).
export async function getTrainingProfile(): Promise<TrainingProfileData> {
  const row = await prisma.trainingProfile.findUnique({ where: { id: 1 } }).catch(() => null);
  if (!row) return DEFAULT_PROFILE;
  return {
    audiences: (row.audiences as AudienceTraining[]) ?? [],
    colors: (row.colors as BrandColor[]) ?? [],
    fonts: (row.fonts as BrandFont[]) ?? [],
    socialPrefs: row.socialPrefs ?? '',
    articlePrefs: row.articlePrefs ?? '',
  };
}

// The stored profile, or null when nobody has saved one yet. Generators use this
// so an unconfigured Training area injects NOTHING into the prompts (no noise
// from starter defaults); the admin UI uses getTrainingProfile() which fills
// helpful defaults for editing.
export async function getSavedTrainingProfile(): Promise<TrainingProfileData | null> {
  const row = await prisma.trainingProfile.findUnique({ where: { id: 1 } }).catch(() => null);
  if (!row) return null;
  return {
    audiences: (row.audiences as AudienceTraining[]) ?? [],
    colors: (row.colors as BrandColor[]) ?? [],
    fonts: (row.fonts as BrandFont[]) ?? [],
    socialPrefs: row.socialPrefs ?? '',
    articlePrefs: row.articlePrefs ?? '',
  };
}

export async function saveTrainingProfile(data: TrainingProfileData): Promise<void> {
  await prisma.trainingProfile.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: { ...data },
  });
}

export async function getTrainingImages(): Promise<TrainingImageData[]> {
  const rows = await prisma.trainingImage.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  return rows.map((r) => ({
    id: r.id,
    url: r.url,
    alt: r.alt,
    category: r.category,
    audience: r.audience,
    tags: r.tags,
    source: r.source,
  }));
}

// Compile the profile into a brand brief injected into both generators' system
// prompts. Only non-empty sections are included so an unfilled profile adds
// nothing noisy.
export function brandBrief(p: TrainingProfileData, opts?: { forAudience?: string }): string {
  const parts: string[] = [];

  const audiences = p.audiences.filter((a) => a.statements.length || a.angles.length);
  const focus = opts?.forAudience?.trim().toLowerCase();
  const ordered = focus
    ? [...audiences].sort((a, b) => (b.audience.toLowerCase() === focus ? 1 : 0) - (a.audience.toLowerCase() === focus ? 1 : 0))
    : audiences;
  if (ordered.length) {
    parts.push(
      'AUDIENCES — tailor voice and pull from these approved lines:\n' +
        ordered
          .map((a) => {
            const s = a.statements.length ? `\n    approved statements: ${a.statements.map((x) => `"${x}"`).join(' · ')}` : '';
            const g = a.angles.length ? `\n    angles to pursue: ${a.angles.join(' · ')}` : '';
            return `  - ${a.audience}:${g}${s}`;
          })
          .join('\n'),
    );
  }

  if (p.colors.length) parts.push('BRAND COLORS: ' + p.colors.map((c) => `${c.name} ${c.hex}`).join(', '));
  if (p.fonts.length) parts.push('BRAND FONTS: ' + p.fonts.map((f) => `${f.name} (${f.usage})`).join(', '));
  if (p.socialPrefs.trim()) parts.push('SOCIAL MEDIA PREFERENCES:\n' + p.socialPrefs.trim());
  if (p.articlePrefs.trim()) parts.push('ARTICLE PREFERENCES:\n' + p.articlePrefs.trim());

  if (!parts.length) return '';
  return `\n\n--- BRAND TRAINING (authoritative — follow this over generic instincts) ---\n${parts.join('\n\n')}\n--- end brand training ---`;
}

// Photo backgrounds usable behind a "photo-hero" post: any real photo in the
// library except graphic doodads (which are stickers/elements, not full-bleed
// backgrounds). Returns absolute/site URLs.
export function photoBackgrounds(images: TrainingImageData[]): TrainingImageData[] {
  return images.filter((i) => i.category !== 'doodads');
}
