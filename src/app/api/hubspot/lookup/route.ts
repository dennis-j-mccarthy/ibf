import { NextRequest, NextResponse } from 'next/server';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Mapping of HubSpot owner IDs to their info and booking URLs
const OWNER_INFO: Record<string, { firstName: string; lastName: string; email: string; bookingUrl: string }> = {
  '681153152': { firstName: 'Alma', lastName: 'Cue', email: 'Alma.Cue@avemaria.edu', bookingUrl: 'https://meetings.hubspot.com/alma-cue' },
  '1438738471': { firstName: 'Jeanette', lastName: 'Pohl', email: 'Jeanette.Pohl@avemaria.edu', bookingUrl: 'https://meetings.hubspot.com/jeanette-pohl1/ignatius-book-fair' },
  // Add Kim's owner ID when you find it:
  // 'KIM_OWNER_ID': { firstName: 'Kim', lastName: 'Neumaier', email: 'Kimberly.Neumaier@avemaria.edu', bookingUrl: 'https://meetings.hubspot.com/kneumaier/ignatius-book-fair' },
};

// Helper: fetch a deal's associated contact
async function getDealContact(dealId: string): Promise<{ firstname?: string; lastname?: string } | null> {
  const assocResponse = await fetch(
    `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts`,
    { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
  );
  if (!assocResponse.ok) return null;

  const assocResult = await assocResponse.json();
  if (!assocResult.results?.length) return null;

  const contactId = assocResult.results[0].id;
  const contactResponse = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname`,
    { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
  );
  if (!contactResponse.ok) return null;

  const contactResult = await contactResponse.json();
  return contactResult.properties;
}

export async function POST(request: NextRequest) {
  try {
    const { website } = await request.json();

    console.log('\n========== HubSpot Lookup ==========');
    console.log('Website:', website || '(none)');

    if (!website) {
      return NextResponse.json({ error: 'Website required' }, { status: 400 });
    }

    if (!HUBSPOT_ACCESS_TOKEN) {
      console.log('ERROR: HUBSPOT_ACCESS_TOKEN not set');
      return NextResponse.json({ error: 'HubSpot not configured' }, { status: 500 });
    }

    let companyData = null;
    let companyId = null;

    // Extract domain from website URL — preserve www. for exact matching
    let domain = website.trim().toLowerCase();
    try {
      if (domain.includes('://')) {
        domain = new URL(domain).hostname;
      } else if (domain.includes('/')) {
        domain = domain.split('/')[0];
      }
    } catch {
      // Use as-is if URL parsing fails
    }

    // Keep both variants for searching
    const domainWithoutWww = domain.replace(/^www\./, '');
    const domainWithWww = domain.startsWith('www.') ? domain : `www.${domain}`;

    console.log('Searching for company by domain:', domain);

    // Try exact domain matches first (including alternate TLDs), then fuzzy
    const domainBase = domainWithoutWww.split('.')[0];
    const domainTLD = domainWithoutWww.split('.').slice(1).join('.');
    const alternateTLDs = ['com', 'org', 'edu', 'net', 'us'].filter(t => t !== domainTLD);

    // Build unique set of exact match candidates
    const exactCandidates = new Set([
      domain,                    // as entered
      domainWithoutWww,          // without www
      domainWithWww,             // with www
      ...alternateTLDs.map(tld => `${domainBase}.${tld}`),
      ...alternateTLDs.map(tld => `www.${domainBase}.${tld}`),
    ]);
    const exactStrategies = [...exactCandidates].map(v => ({ value: v, description: `exact: ${v}` }));

    // Phase 1: Try exact matches
    for (const strategy of exactStrategies) {
      if (companyId) break;

      console.log(`Trying domain search: ${strategy.description} (EQ: ${strategy.value})`);

      const companyResponse = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'domain',
              operator: 'EQ',
              value: strategy.value,
            }],
          }],
          properties: ['name', 'domain', 'city', 'state', 'hubspot_owner_id', 'book_fair_dates', 'book_fair_status'],
        }),
      });

      if (companyResponse.ok) {
        const companyResult = await companyResponse.json();
        console.log(`  Results: ${companyResult.results?.length || 0} found`);
        if (companyResult.results?.length > 0) {
          companyData = companyResult.results[0].properties;
          companyId = companyResult.results[0].id;
          console.log('Found company:', companyData.name, '(ID:', companyId, ')');
        }
      }
    }

    if (!companyId) {
      console.log('No company found for domain:', domain);
      console.log('=========================================\n');
      return NextResponse.json({ found: false });
    }

    // Get owner info
    let ownerData = null;
    let bookingUrl = null;

    if (companyData?.hubspot_owner_id) {
      const ownerInfo = OWNER_INFO[companyData.hubspot_owner_id];
      if (ownerInfo) {
        ownerData = { firstName: ownerInfo.firstName, lastName: ownerInfo.lastName, email: ownerInfo.email };
        bookingUrl = ownerInfo.bookingUrl;
      }
    }

    // Fetch deals associated with this company
    let lastDeal = null;
    let upcomingDeal = null;
    let contactName: string | null = null;
    const dealsResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/deals`,
      { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
    );

    if (dealsResponse.ok) {
      const dealsResult = await dealsResponse.json();
      console.log('Associated deals:', dealsResult.results?.length || 0);

      if (dealsResult.results?.length > 0) {
        const dealIds = dealsResult.results.map((r: { id: string }) => r.id);

        // Only fetch the deal properties we actually need
        const neededDealProps = ['dealname', 'dealtype', 'dealstage', 'book_fair_start_date', 'book_fair_end_date'];

        // Fetch deal details
        const dealDetailsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/deals/batch/read',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: neededDealProps,
              inputs: dealIds.map((id: string) => ({ id })),
            }),
          }
        );
        const dealDetailsResult = dealDetailsResponse.ok
          ? await dealDetailsResponse.json()
          : { results: [] };

        if (dealDetailsResult.results.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const allDeals = dealDetailsResult.results;

          // Log all deals for debugging
          allDeals.forEach((d: { id: string; properties: Record<string, string> }) => {
            console.log(`  Deal ${d.id}: "${d.properties.dealname}" | start: ${d.properties.book_fair_start_date} | type: ${d.properties.dealtype} | stage: ${d.properties.dealstage}`);
          });

          // Parse date-only strings with T12:00:00 to avoid UTC timezone shift
          const parseDate = (d: string) => new Date(d + 'T12:00:00');

          // Upcoming: deal whose end date hasn't passed yet (or start date if no end date)
          const upcoming = allDeals
            .filter((d: { properties: { book_fair_start_date?: string; book_fair_end_date?: string } }) => {
              const endDate = d.properties.book_fair_end_date || d.properties.book_fair_start_date;
              return endDate && parseDate(endDate) >= today;
            })
            .sort((a: { properties: { book_fair_start_date?: string } }, b: { properties: { book_fair_start_date?: string } }) =>
              parseDate(a.properties.book_fair_start_date!).getTime() - parseDate(b.properties.book_fair_start_date!).getTime());

          // Past: deal whose end date has passed
          const past = allDeals
            .filter((d: { properties: { book_fair_start_date?: string; book_fair_end_date?: string } }) => {
              const endDate = d.properties.book_fair_end_date || d.properties.book_fair_start_date;
              return endDate && parseDate(endDate) < today;
            })
            .sort((a: { properties: { book_fair_start_date?: string } }, b: { properties: { book_fair_start_date?: string } }) =>
              parseDate(b.properties.book_fair_start_date!).getTime() - parseDate(a.properties.book_fair_start_date!).getTime());

          if (upcoming.length > 0) {
            const up = upcoming[0].properties;
            upcomingDeal = { dealname: up.dealname, dealtype: up.dealtype, book_fair_start_date: up.book_fair_start_date, book_fair_end_date: up.book_fair_end_date };
            const contact = await getDealContact(upcoming[0].id);
            if (contact?.firstname) {
              contactName = contact.firstname;
            }
          }

          if (past.length > 0) {
            const pd = past[0].properties;
            lastDeal = { dealname: pd.dealname, dealtype: pd.dealtype, book_fair_start_date: pd.book_fair_start_date, book_fair_end_date: pd.book_fair_end_date };
            if (!contactName) {
              const contact = await getDealContact(past[0].id);
              if (contact?.firstname) {
                contactName = contact.firstname;
              }
            }
          }
        }
      }
    }

    console.log('Lookup SUCCESS - Company:', companyData.name, 'Contact:', contactName, 'BookingUrl:', !!bookingUrl);
    console.log('=========================================\n');

    return NextResponse.json({
      found: true,
      contactName,
      company: companyData,
      upcomingDeal,
      lastDeal,
      owner: ownerData,
      bookingUrl,
    });

  } catch (error) {
    console.error('HubSpot lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
