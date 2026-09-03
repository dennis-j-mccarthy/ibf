// Read-only HubSpot client for the email audit.
//
// Uses HUBSPOT_MARKETING_TOKEN, a private app with exactly two scopes:
// `content` and `automation`. Deliberately NOT HUBSPOT_PRIVATE_APP_TOKEN --
// that app carries crm.objects.deals.write, and a live n8n webhook mutates
// production Postgres when Deal properties change (see the warning block in
// src/lib/book-fair-admin/hubspot.ts). This module must only ever issue GETs.

const BASE = 'https://api.hubapi.com';

export function marketingToken(): string | null {
  return process.env.HUBSPOT_MARKETING_TOKEN || null;
}

// HubSpot rate limits are easy to trip when fetching hundreds of email
// details; every call goes through one retrying GET with exponential backoff
// on 429/5xx. Callers additionally cap concurrency at 2.
async function hubspotGet(path: string): Promise<unknown> {
  const token = marketingToken();
  if (!token) throw new Error('HUBSPOT_MARKETING_TOKEN is not set');

  let delay = 1000;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (res.status === 429 || res.status === 502 || res.status === 503) {
      if (attempt >= 4) throw new Error(`HubSpot ${res.status} after ${attempt + 1} tries: ${path}`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
      continue;
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`HubSpot ${res.status} on ${path}: ${body}`);
    }
    return res.json();
  }
}

export type EmailSummary = { id: string; name: string; subject: string };

// One page of GET /marketing/v3/emails. Returns the next cursor so the audit
// can spread listing across step calls.
export async function listEmailsPage(
  after?: string | null,
): Promise<{ emails: EmailSummary[]; nextAfter: string | null }> {
  const qs = new URLSearchParams({ limit: '100' });
  if (after) qs.set('after', after);
  const data = (await hubspotGet(`/marketing/v3/emails?${qs}`)) as {
    results?: { id: string | number; name?: string; subject?: string }[];
    paging?: { next?: { after?: string } };
  };
  return {
    emails: (data.results ?? []).map((e) => ({
      id: String(e.id),
      name: e.name ?? '',
      subject: e.subject ?? '',
    })),
    nextAfter: data.paging?.next?.after ?? null,
  };
}

// Full email detail including content.widgets.
export async function getEmailDetail(id: string): Promise<Record<string, unknown>> {
  return (await hubspotGet(`/marketing/v3/emails/${id}`)) as Record<string, unknown>;
}

// Flow counts for the run header. v4, not v3: v3 returns only contact-scoped
// legacy workflows (19); v4 returns all flows including the deal- and
// company-scoped ones that actually run the business (75, 62 enabled as of
// 2026-08-31).
export async function countFlows(): Promise<{ total: number; enabled: number }> {
  let total = 0;
  let enabled = 0;
  let after: string | null = null;
  do {
    const qs = new URLSearchParams({ limit: '100' });
    if (after) qs.set('after', after);
    const data = (await hubspotGet(`/automation/v4/flows?${qs}`)) as {
      results?: { isEnabled?: boolean }[];
      paging?: { next?: { after?: string } };
    };
    for (const f of data.results ?? []) {
      total += 1;
      if (f.isEnabled) enabled += 1;
    }
    after = data.paging?.next?.after ?? null;
  } while (after);
  return { total, enabled };
}
