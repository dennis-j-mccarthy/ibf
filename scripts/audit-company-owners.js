#!/usr/bin/env node
/**
 * Audit HubSpot companies for book-fair-pro coverage.
 *
 * The sign-up form's duplicate-domain panel shows a pro's name, email and
 * booking link only when the company's hubspot_owner_id is present AND appears
 * in OWNER_INFO (src/app/api/hubspot/lookup/route.ts). Anything else renders a
 * company name and nothing to click, with submit disabled -- a dead end.
 *
 * Those two failures need different fixes, so they are counted separately:
 *   - no owner in HubSpot      -> assign the company to someone in HubSpot
 *   - owner not in OWNER_INFO  -> add that owner id to the map in the codebase
 *
 * Run:  set -a && . ./.env.local && set +a && node scripts/audit-company-owners.js
 */

// Keep in sync with OWNER_INFO in src/app/api/hubspot/lookup/route.ts
const MAPPED_OWNERS = {
  '681153152': 'Alma Cue',
  '1438738471': 'Jeanette Pohl',
  '87125142': 'Julie DeGregoria',
  '88241325': 'Marni Spewock',
  '462970226': 'Kim Neumaier',
};

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('No HUBSPOT_PRIVATE_APP_TOKEN in env. Did you source .env.local?');
  process.exit(1);
}

async function main() {
  const companies = [];
  let after;
  do {
    const url = new URL('https://api.hubapi.com/crm/v3/objects/companies');
    url.searchParams.set('limit', '100');
    url.searchParams.set('properties', 'domain,name,hubspot_owner_id');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) {
      console.error(`HubSpot ${res.status}:`, (await res.text()).slice(0, 400));
      process.exit(1);
    }
    const body = await res.json();
    companies.push(...body.results);
    after = body.paging?.next?.after;
    process.stderr.write(`\r  fetched ${companies.length}…`);
  } while (after);
  process.stderr.write('\n\n');

  const withDomain = companies.filter((c) => (c.properties.domain || '').trim());
  const noOwner = [];
  const unmappedOwner = [];
  const unmappedIds = new Map();

  for (const c of withDomain) {
    const id = (c.properties.hubspot_owner_id || '').trim();
    if (!id) {
      noOwner.push(c);
    } else if (!MAPPED_OWNERS[id]) {
      unmappedOwner.push(c);
      unmappedIds.set(id, (unmappedIds.get(id) || 0) + 1);
    }
  }

  const covered = withDomain.length - noOwner.length - unmappedOwner.length;
  const pct = (n) => (withDomain.length ? ((n / withDomain.length) * 100).toFixed(1) + '%' : '—');

  console.log(`companies total            : ${companies.length}`);
  console.log(`companies with a domain    : ${withDomain.length}\n`);
  console.log(`would show a book fair pro : ${covered}  (${pct(covered)})`);
  console.log(`DEAD END - no owner in HS  : ${noOwner.length}  (${pct(noOwner.length)})`);
  console.log(`DEAD END - owner unmapped  : ${unmappedOwner.length}  (${pct(unmappedOwner.length)})`);
  console.log(`DEAD END - combined        : ${noOwner.length + unmappedOwner.length}  (${pct(noOwner.length + unmappedOwner.length)})\n`);

  if (unmappedIds.size) {
    console.log('owner ids seen but missing from OWNER_INFO (add these):');
    [...unmappedIds.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, n]) => console.log(`   ${id}  ${n} companies`));
    console.log('');
  }

  console.log('sample of companies with no owner at all:');
  noOwner.slice(0, 10).forEach((c) =>
    console.log(`   ${(c.properties.domain || '').padEnd(34)} ${c.properties.name || ''}`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
