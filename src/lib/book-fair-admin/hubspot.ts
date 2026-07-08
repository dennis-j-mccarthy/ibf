// Thin read-only HubSpot CRM v3 client for the coordinator dashboard.
//
// READ-ONLY: this module must only ever issue GET requests. The private app
// token (HUBSPOT_PRIVATE_APP_TOKEN) is provisioned with read scopes only,
// and the code must never attempt a write regardless.
//
// ============================ DO NOT WRITE ============================
// NEVER touch these Deal properties in ANY write context, in this module
// or any future code path:
//   dealstage, hs_priority, account_number, ave_dollar_email,
//   book_fair_start_date, book_fair_end_date, sales_tax_rate, fair_size
// A live n8n webhook listens on these properties and mutates production
// Postgres when they change. Writing them would corrupt production data.
// ======================================================================
//
// Reads come in two shapes:
//   - getDeal/getDeals: single-object GETs, deduped per request via cache().
//     Right for the coordinator dashboard, which reads a handful of deals.
//   - getDealsByIds: HubSpot's POST /batch/read (100 ids/call). Right for the
//     staff Upcoming Fairs list, which reads hundreds of deals at once — one
//     GET each would blow the rate limit. batch/read is still a NON-MUTATING
//     read (it returns properties, never writes them), so it honors the
//     "never write Deal properties" rule below even though it isn't a GET.

import { cache } from 'react';

const HUBSPOT_BASE = 'https://api.hubapi.com';

// The Deal's internal-only net-income property ("Net Income INTERNAL ONLY")
// must never be requested or displayed anywhere coordinator-facing.
const DEAL_PROPERTIES = [
  'total_sales',
  'total_items_sold',
  'virtual_book_fair',
  'book_fair_start_date',
  'book_fair_end_date',
  'fair_size',
  'cash_back',
  'dealtype',
  'hubspot_owner_id',
  'dealstage',
  // Contacts (read-only): Ave $ admin and book fair coordinator ("chair/organizer").
  'ave_dollars_first_name',
  'ave_dollars_last_name',
  'ave_dollar_email',
  'chair_organizer_first_name',
  'chair_organizer_last_name',
  'chair_organizer_email',
  'principal_name',
  // Staff fair-detail popup (read-only).
  'account_number',
  'fair_type',
  'students_enrolled',
] as const;

const COMPANY_PROPERTIES = [
  'tax_exempt_form',
  'tax_exempt_received__manually_',
  'sales_tax_expiration',
  'company_identifier',
  'domain',
  // Staff fair-detail popup (read-only).
  'name',
  'city',
  'state',
  'address',
  'grade_levels',
] as const;

export interface HubSpotDeal {
  id: string;
  properties: Partial<Record<(typeof DEAL_PROPERTIES)[number], string | null>>;
}

export interface HubSpotCompany {
  id: string;
  properties: Partial<Record<(typeof COMPANY_PROPERTIES)[number], string | null>>;
}

async function hubspotGet<T>(path: string): Promise<T | null> {
  // Prefer the dedicated read-only private app token; fall back to the
  // site's existing HUBSPOT_ACCESS_TOKEN (already on Vercel) so the
  // dashboard works before the read-only token is provisioned. This module
  // only issues GETs regardless of which token is used.
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.error('HUBSPOT_PRIVATE_APP_TOKEN / HUBSPOT_ACCESS_TOKEN are not set');
    return null;
  }
  try {
    const res = await fetch(`${HUBSPOT_BASE}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`HubSpot GET ${path} failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`HubSpot GET ${path} error:`, error);
    return null;
  }
}

// cache() dedupes per request: the dashboard can ask for the same deal from
// multiple sections without extra round-trips. Returns null on any failure so
// callers degrade to Postgres-only rendering.
export const getDeal = cache(async (dealId: string): Promise<HubSpotDeal | null> => {
  return hubspotGet<HubSpotDeal>(
    `/crm/v3/objects/deals/${encodeURIComponent(dealId)}?properties=${DEAL_PROPERTIES.join(',')}`
  );
});

export const getCompany = cache(async (companyId: string): Promise<HubSpotCompany | null> => {
  return hubspotGet<HubSpotCompany>(
    `/crm/v3/objects/companies/${encodeURIComponent(companyId)}?properties=${COMPANY_PROPERTIES.join(',')}`
  );
});

export interface HubSpotOwner {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Resolve a deal's owner (the Ignatius rep) by id. Needs the
// crm.objects.owners.read scope on the private app.
export const getOwner = cache(async (ownerId: string): Promise<HubSpotOwner | null> => {
  return hubspotGet<HubSpotOwner>(`/crm/v3/owners/${encodeURIComponent(ownerId)}`);
});

// Fetch several deals concurrently (single-object GETs — see header comment).
// Missing/failed deals come back as null entries keyed by id.
export async function getDeals(dealIds: string[]): Promise<Map<string, HubSpotDeal | null>> {
  const unique = [...new Set(dealIds)];
  const results = await Promise.all(unique.map((id) => getDeal(id)));
  return new Map(unique.map((id, i) => [id, results[i]]));
}

// Batch-read many deals: one POST /batch/read per 100 ids (see header comment).
// NON-MUTATING read only. Every id is present in the returned map; ids HubSpot
// couldn't return (deleted/inaccessible) map to null.
export async function getDealsByIds(dealIds: string[]): Promise<Map<string, HubSpotDeal | null>> {
  const unique = [...new Set(dealIds)];
  const out = new Map<string, HubSpotDeal | null>(unique.map((id) => [id, null]));
  if (unique.length === 0) return out;

  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN ?? process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.error('HUBSPOT_PRIVATE_APP_TOKEN / HUBSPOT_ACCESS_TOKEN are not set');
    return out;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals/batch/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ properties: DEAL_PROPERTIES, inputs: chunk.map((id) => ({ id })) }),
        });
        if (!res.ok) {
          console.error(`HubSpot batch read failed: ${res.status}`);
          return;
        }
        const data = (await res.json()) as { results?: Array<{ id: string; properties: HubSpotDeal['properties'] }> };
        for (const r of data.results ?? []) {
          out.set(String(r.id), { id: String(r.id), properties: r.properties ?? {} });
        }
      } catch (error) {
        console.error('HubSpot batch read error:', error);
      }
    })
  );
  return out;
}

// total_sales is a string in HubSpot — parse defensively. Returns the numeric
// value, or null if unparseable (callers should then show the raw string).
export function parseDollarString(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
