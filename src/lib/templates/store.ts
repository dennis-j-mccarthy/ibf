import type { Template as TemplateRow } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TEMPLATES, type TemplateDef, type TemplateKind } from './defaults';
import { renderTokens, type TokenValues } from './tokens';

// Templates come from two places: the built-in library in defaults.ts (always
// present, version-controlled) and Template rows the admin studio writes. A row
// with a matching slug overrides its default; a row with a new slug is an
// admin-authored addition. The DB read is best-effort so the library still
// renders before the Template table exists.

export interface Template extends TemplateDef {
  // true when an admin has edited or added this one in the studio.
  customized: boolean;
  isActive: boolean;
}

function fromRow(row: TemplateRow): Template {
  return {
    slug: row.slug,
    kind: row.kind as TemplateKind,
    name: row.name,
    description: row.description,
    audience: row.audience,
    subject: row.subject,
    body: row.body,
    heroImage: row.heroImage,
    heroScript: row.heroScript,
    footerImage: row.footerImage,
    order: row.order,
    customized: true,
    isActive: row.isActive,
  };
}

export async function getTemplates(): Promise<Template[]> {
  // Best-effort: the library still renders from defaults if the table is absent.
  const rows = await prisma.template.findMany().catch((): TemplateRow[] => []);
  const bySlug = new Map<string, Template>(
    DEFAULT_TEMPLATES.map((d) => [d.slug, { ...d, customized: false, isActive: true }])
  );
  for (const row of rows) bySlug.set(row.slug, fromRow(row));
  return [...bySlug.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.order - b.order);
}

// The templates a given fair should see: active, and either universal or
// tagged for this fair's audience.
export function templatesForAudience(all: Template[], audience: string): Template[] {
  return all.filter((t) => t.isActive && (!t.audience || t.audience === audience));
}

// A template with every {{token}} resolved, ready to render as a letter.
export interface ResolvedTemplate {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  subject: string;
  body: string;
  heroImage: string;
  heroScript: string;
  footerImage: string;
}

export function resolveTemplate(t: Template, values: TokenValues): ResolvedTemplate {
  return {
    slug: t.slug,
    kind: t.kind,
    name: t.name,
    description: t.description,
    subject: renderTokens(t.subject, values),
    body: renderTokens(t.body, values),
    heroImage: t.heroImage,
    heroScript: renderTokens(t.heroScript, values),
    footerImage: t.footerImage,
  };
}
