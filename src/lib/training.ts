import { prisma } from '@/lib/prisma';

// The brand "training" profile + image library that inform the blog and social
// generators. One editable profile row (singleton) plus a tagged image table.

export type AudienceTraining = {
  audience: string;
  persona: string;
  painPoints: string[];
  // One bucket for statements & angles (the old separate `angles` list is merged
  // into `statements` on read; the angles fields are kept for backward compat).
  statements: string[];
  angles: string[];
  // Starred favorites ("I like this") — weighted heavily by the generators.
  starredStatements: string[];
  starredAngles: string[];
};
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

export const IMAGE_CATEGORIES = ['kids', 'bookfairs', 'parents', 'teachers', 'admins', 'logos', 'doodads', 'other'] as const;

// Sensible starter profile so the tools have brand context before anyone edits.
const DEFAULT_PROFILE: TrainingProfileData = {
  audiences: [
    { audience: 'Parents', persona: '', painPoints: [], statements: [], angles: [], starredStatements: [], starredAngles: [] },
    { audience: 'Teachers', persona: '', painPoints: [], statements: [], angles: [], starredStatements: [], starredAngles: [] },
    { audience: 'Administrators', persona: '', painPoints: [], statements: [], angles: [], starredStatements: [], starredAngles: [] },
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

// Rows saved before persona/painPoints existed lack those keys — fill them in.
const normalizeAudiences = (v: unknown): AudienceTraining[] =>
  ((v as Partial<AudienceTraining>[]) ?? []).map((a) => {
    // Fold legacy angles into the single statements & angles bucket.
    const statements = [...(a.statements ?? []), ...(a.angles ?? []).filter((x) => !(a.statements ?? []).includes(x))];
    const starredStatements = [...(a.starredStatements ?? []), ...(a.starredAngles ?? []).filter((x) => !(a.starredStatements ?? []).includes(x))];
    return {
      audience: a.audience ?? '',
      persona: a.persona ?? '',
      painPoints: a.painPoints ?? [],
      statements,
      angles: [],
      starredStatements,
      starredAngles: [],
    };
  });

// Read the singleton profile, falling back to defaults when the row is absent
// (so the generators always get usable context).
export async function getTrainingProfile(): Promise<TrainingProfileData> {
  const row = await prisma.trainingProfile.findUnique({ where: { id: 1 } }).catch(() => null);
  if (!row) return DEFAULT_PROFILE;
  return {
    audiences: normalizeAudiences(row.audiences),
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
    audiences: normalizeAudiences(row.audiences),
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

export type TrainingDocumentData = {
  id: number;
  title: string;
  url: string;
  kind: string; // design-language | angles | other
  text: string;
};

export async function getTrainingDocuments(): Promise<TrainingDocumentData[]> {
  const rows = await prisma.trainingDocument.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  return rows.map((r) => ({ id: r.id, title: r.title, url: r.url, kind: r.kind, text: r.text }));
}

// Best-effort text extraction so uploaded docs can inform the generators.
// PDFs via unpdf; plain text/markdown directly; everything else stays empty.
const MAX_DOC_TEXT = 20000;
export async function extractDocText(url: string, contentType: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const type = contentType || res.headers.get('content-type') || '';
    if (type.includes('pdf') || /\.pdf(\?|$)/i.test(url)) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
      const { text } = await extractText(pdf, { mergePages: true });
      return String(text).replace(/\s+/g, ' ').trim().slice(0, MAX_DOC_TEXT);
    }
    if (type.startsWith('text/') || /\.(txt|md)(\?|$)/i.test(url)) {
      return (await res.text()).trim().slice(0, MAX_DOC_TEXT);
    }
    return '';
  } catch {
    return '';
  }
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
export function brandBrief(p: TrainingProfileData, opts?: { forAudience?: string; docs?: TrainingDocumentData[] }): string {
  const parts: string[] = [];

  const audiences = p.audiences.filter((a) => a.statements.length || a.angles.length || a.persona.trim() || a.painPoints.length);
  const focus = opts?.forAudience?.trim().toLowerCase();
  const ordered = focus
    ? [...audiences].sort((a, b) => (b.audience.toLowerCase() === focus ? 1 : 0) - (a.audience.toLowerCase() === focus ? 1 : 0))
    : audiences;
  if (ordered.length) {
    parts.push(
      'AUDIENCES — tailor voice and pull from these approved lines:\n' +
        ordered
          .map((a) => {
            const p2 = a.persona.trim() ? `\n    persona: ${a.persona.trim()}` : '';
            const pain = a.painPoints.length ? `\n    pain points to speak to: ${a.painPoints.join(' · ')}` : '';
            const favS = a.starredStatements.filter((x) => a.statements.includes(x));
            const restS = a.statements.filter((x) => !favS.includes(x));
            const s = a.statements.length
              ? `\n    approved statements & angles${favS.length ? ' (★ = team favorites — weight these heavily, lead with them, emulate their style)' : ''}: ${[...favS.map((x) => `★ "${x}"`), ...restS.map((x) => `"${x}"`)].join(' · ')}`
              : '';
            return `  - ${a.audience}:${p2}${pain}${s}`;
          })
          .join('\n'),
    );
  }

  // Uploaded reference docs, grouped by kind: design-language docs steer visual/
  // verbal identity; angle docs steer messaging. Capped so the prompt stays sane.
  const docsWithText = (opts?.docs ?? []).filter((d) => d.text.trim());
  const PER_DOC = 2500;
  const docBlock = (label: string, docs: TrainingDocumentData[]) =>
    docs.length
      ? `${label}\n${docs.map((d) => `--- ${d.title} ---\n${d.text.slice(0, PER_DOC)}`).join('\n')}`
      : '';
  const design = docBlock('DESIGN LANGUAGE REFERENCE (from uploaded brand docs — follow this visual & verbal identity):', docsWithText.filter((d) => d.kind === 'design-language'));
  const messaging = docBlock('MESSAGING & ANGLE REFERENCE (from uploaded brand docs — draw angles, phrasing, and emphasis from this):', docsWithText.filter((d) => d.kind === 'angles'));
  const otherDocs = docBlock('OTHER BRAND REFERENCE DOCS:', docsWithText.filter((d) => d.kind !== 'design-language' && d.kind !== 'angles'));
  for (const block of [design, messaging, otherDocs]) if (block) parts.push(block);

  if (p.colors.length) parts.push('BRAND COLORS: ' + p.colors.map((c) => `${c.name} ${c.hex}`).join(', '));
  if (p.fonts.length) parts.push('BRAND FONTS: ' + p.fonts.map((f) => `${f.name} (${f.usage})`).join(', '));
  if (p.socialPrefs.trim()) parts.push('SOCIAL MEDIA PREFERENCES:\n' + p.socialPrefs.trim());
  if (p.articlePrefs.trim()) parts.push('ARTICLE PREFERENCES:\n' + p.articlePrefs.trim());

  if (!parts.length) return '';
  return `\n\n--- BRAND TRAINING (authoritative — follow this over generic instincts) ---\n${parts.join('\n\n')}\n--- end brand training ---`;
}

// Photo backgrounds usable behind a "photo-hero" post: real photos of people/
// scenes ONLY. Excludes logos and graphic doodads (never full-bleed backgrounds),
// and defensively drops any logo/wordmark-named file even if miscategorized.
export function photoBackgrounds(images: TrainingImageData[]): TrainingImageData[] {
  return images.filter(
    (i) => i.category !== 'doodads' && i.category !== 'logos' && !/logo|wordmark/i.test(i.url),
  );
}
