// Audits every HubSpot marketing email for dead links — the S3 bucket that now
// returns 403, and anything else that no longer resolves.
//
//   node --env-file=.env.local scripts/audit-hubspot-email-links.mjs
//
// Read-only: it fetches emails and follows their links. It changes nothing in
// HubSpot. If the token lacks the scope, it says exactly which one to add.

const TOKEN =
  process.env.HUBSPOT_PRIVATE_APP_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("No HUBSPOT_PRIVATE_APP_TOKEN / HUBSPOT_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

const hs = (path) =>
  fetch(`https://api.hubapi.com/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

// Links we already know are dead: the bucket 403s for every object.
const KNOWN_DEAD = /ignatius-book-fair\.s3[.-][a-z0-9-]*\.amazonaws\.com/i;

async function main() {
  console.log("Fetching marketing emails…\n");

  const emails = [];
  let after;
  for (let page = 0; page < 20; page++) {
    const qs = new URLSearchParams({ limit: "100" });
    if (after) qs.set("after", after);
    const res = await hs(`marketing/v3/emails?${qs}`);

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      console.error("HubSpot refused the request:\n  " + (body.message || res.statusText));
      // HubSpot names the scopes it wanted; print those verbatim rather than
      // guessing, since the docs are vague about this endpoint.
      const required =
        body.context?.requiredScopes ||
        body.context?.requiredGranularScopes ||
        body.requiredScopes;
      if (required?.length) {
        console.error("\nHubSpot says this app needs:");
        for (const s of required) console.error("  " + s);
      } else {
        console.error("\nHubSpot did not name a scope. The one that covers marketing email is 'content'.");
      }
      console.error(
        "\nAdd it under Settings → Integrations → Private Apps → (your app) → Scopes,\n" +
          "then re-copy the token into .env.local and run this again.\n" +
          "Note: 'content' requires Marketing Hub Professional or Enterprise. On a lower\n" +
          "tier the scope is unavailable and these emails have to be checked by hand."
      );
      process.exit(2);
    }
    if (!res.ok) {
      console.error(`HubSpot returned ${res.status}: ${await res.text()}`);
      process.exit(1);
    }

    const data = await res.json();
    emails.push(...(data.results || []));
    after = data.paging?.next?.after;
    if (!after) break;
  }

  console.log(`Found ${emails.length} email(s). Scanning for links…\n`);

  // Collect every URL, remembering which emails used it, so each is tested once.
  const byUrl = new Map();
  for (const e of emails) {
    const hay = JSON.stringify(e);
    for (const m of hay.matchAll(/https?:\\?\/\\?\/[^"'\s<>\\)]+/g)) {
      const url = m[0].replace(/\\/g, "").replace(/[.,;:)]+$/, "");
      if (/hubspot|hs-sites|hsforms|list-manage|\.(png|jpg|jpeg|gif|svg|css|js)$/i.test(url)) continue;
      if (!byUrl.has(url)) byUrl.set(url, new Set());
      byUrl.get(url).add(e.name || e.subject || `email ${e.id}`);
    }
  }

  console.log(`${byUrl.size} distinct link(s) to check.\n`);

  const dead = [];
  for (const [url, users] of byUrl) {
    let status;
    if (KNOWN_DEAD.test(url)) {
      status = 403;
    } else {
      try {
        let r = await fetch(url, { method: "HEAD", redirect: "follow" });
        if (r.status === 405 || r.status === 501) {
          r = await fetch(url, { method: "GET", redirect: "follow" });
        }
        status = r.status;
      } catch {
        status = "unreachable";
      }
    }
    if (status === "unreachable" || Number(status) >= 400) {
      dead.push({ url, status, users: [...users] });
    }
  }

  if (!dead.length) {
    console.log("No dead links found in any marketing email.");
    return;
  }

  console.log(`${dead.length} DEAD LINK(S):\n`);
  for (const d of dead) {
    console.log(`  ${d.status}  ${d.url}`);
    for (const u of d.users) console.log(`         used in: ${u}`);
    if (KNOWN_DEAD.test(d.url)) {
      const file = decodeURIComponent(d.url.split("/").pop());
      console.log(`         fix: https://www.ignatiusbookfairs.com/documents/${file}`);
    }
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
