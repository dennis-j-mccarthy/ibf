#!/usr/bin/env node
/**
 * Does the private app token have crm.objects.owners.read?
 *
 * The duplicate-domain panel can only stop dead-ending 45% of companies if we
 * resolve owner names live instead of from a hardcoded map. That depends on
 * this one scope, so check it before building on the assumption.
 *
 * Run: set -a && . ./.env.local && set +a && node scripts/check-owner-scope.js
 */
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('No HUBSPOT_PRIVATE_APP_TOKEN in env. Did you source .env.local?');
  process.exit(1);
}

// The unmapped owner ids the company audit surfaced, biggest first.
const IDS = ['87125142', '88241325', '462970226', '2059546908', '730681713', '84098903'];

async function main() {
  const res = await fetch('https://api.hubapi.com/crm/v3/owners?limit=100', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const body = await res.text();
    console.log(`/crm/v3/owners -> ${res.status}`);
    console.log(body.slice(0, 400));
    console.log('\nIf this is MISSING_SCOPES, add crm.objects.owners.read to the private app.');
    return;
  }
  const all = (await res.json()).results || [];
  console.log(`owners readable: ${all.length}\n`);
  const byId = new Map(all.map((o) => [String(o.id), o]));

  console.log('the unmapped ids from the company audit:');
  for (const id of IDS) {
    const o = byId.get(id);
    console.log(
      `  ${id.padEnd(12)} ${o ? `${o.firstName || ''} ${o.lastName || ''}`.trim().padEnd(22) + (o.email || '') : 'NOT FOUND'}`,
    );
  }

  console.log('\nall owners:');
  all.forEach((o) =>
    console.log(`  ${String(o.id).padEnd(12)} ${`${o.firstName || ''} ${o.lastName || ''}`.trim().padEnd(22)} ${o.email || ''}`),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
