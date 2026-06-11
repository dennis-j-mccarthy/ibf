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
// Note: the spec asks to batch past-fair Deal reads. HubSpot's batch-read
// endpoint is POST-only, which conflicts with the GET-only constraint above;
// the constraint wins, so we issue parallel single-object GETs instead,
// deduplicated per request via React cache().

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
] as const;

const COMPANY_PROPERTIES = [
  'tax_exempt_form',
  'tax_exempt_received__manually_',
  'sales_tax_expiration',
  'company_identifier',
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

// Fetch several deals concurrently (single-object GETs — see header comment).
// Missing/failed deals come back as null entries keyed by id.
export async function getDeals(dealIds: string[]): Promise<Map<string, HubSpotDeal | null>> {
  const unique = [...new Set(dealIds)];
  const results = await Promise.all(unique.map((id) => getDeal(id)));
  return new Map(unique.map((id, i) => [id, results[i]]));
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
