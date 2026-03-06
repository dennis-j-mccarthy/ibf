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

    // Extract domain from website URL
    let domain = website;
    try {
      if (website.includes('://')) {
        domain = new URL(website).hostname;
      } else if (website.includes('/')) {
        domain = website.split('/')[0];
      }
      domain = domain.replace(/^www\./, '');
    } catch {
      // Use as-is if URL parsing fails
    }

    console.log('Searching for company by domain:', domain);

    // Try multiple search strategies for domain matching
    const searchStrategies = [
      { operator: 'EQ', value: domain, description: 'exact match' },
      { operator: 'CONTAINS_TOKEN', value: domain.split('.')[0], description: 'contains token' },
      { operator: 'EQ', value: `www.${domain}`, description: 'with www prefix' },
    ];

    for (const strategy of searchStrategies) {
      if (companyId) break;

      console.log(`Trying domain search: ${strategy.description} (${strategy.operator}: ${strategy.value})`);

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
              operator: strategy.operator,
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

    // Strategy 4: Try searching by name
    if (!companyId) {
      const domainName = domain.split('.')[0];
      if (domainName.length > 3) {
        console.log(`Trying company name search: ${domainName}`);
        const nameSearchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'name',
                operator: 'CONTAINS_TOKEN',
                value: domainName,
              }],
            }],
            properties: ['name', 'domain', 'city', 'state', 'hubspot_owner_id', 'book_fair_dates', 'book_fair_status'],
          }),
        });

        if (nameSearchResponse.ok) {
          const nameResult = await nameSearchResponse.json();
          if (nameResult.results?.length > 0) {
            companyData = nameResult.results[0].properties;
            companyId = nameResult.results[0].id;
            console.log('Found company by name:', companyData.name, '(ID:', companyId, ')');
          }
        }
      }
    }

    if (!companyId) {
      console.log('No company found for domain:', domain);
      console.log('=========================================\n');
      return NextResponse.json({ found: false });
    }

    // Fetch ALL company properties by ID (including custom fields)
    let allCompanyProperties: Record<string, string> = {};
    const companyPropsResponse = await fetch(
      'https://api.hubapi.com/crm/v3/properties/companies',
      { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
    );
    let companyPropNames: string[] = [];
    if (companyPropsResponse.ok) {
      const companyPropsResult = await companyPropsResponse.json();
      companyPropNames = companyPropsResult.results.map((p: { name: string }) => p.name);
    }
    const companyFullResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=${companyPropNames.join(',')}`,
      { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
    );
    if (companyFullResponse.ok) {
      const companyFull = await companyFullResponse.json();
      allCompanyProperties = companyFull.properties || {};
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
    let allDealProperties: { id: string; properties: Record<string, string> }[] = [];

    const dealsResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/deals`,
      { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
    );

    if (dealsResponse.ok) {
      const dealsResult = await dealsResponse.json();
      console.log('Associated deals:', dealsResult.results?.length || 0);

      if (dealsResult.results?.length > 0) {
        const dealIds = dealsResult.results.map((r: { id: string }) => r.id);

        // Get all deal property names so we can fetch everything including custom fields
        const propsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/properties/deals',
          { headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` } }
        );
        let allPropNames = ['dealname', 'closedate', 'dealstage', 'amount', 'book_fair_start_date'];
        if (propsResponse.ok) {
          const propsResult = await propsResponse.json();
          allPropNames = propsResult.results.map((p: { name: string }) => p.name);
          // Log custom properties (ones containing "fair" or "book")
          const fairProps = propsResult.results
            .filter((p: { name: string; label: string }) =>
              p.name.toLowerCase().includes('fair') || p.name.toLowerCase().includes('book') ||
              p.label.toLowerCase().includes('fair') || p.label.toLowerCase().includes('book'))
            .map((p: { name: string; label: string }) => `${p.name} (${p.label})`);
          console.log('Deal properties related to fair/book:', fairProps);
        }

        // Fetch deal details with ALL properties
        const dealDetailsResponse = await fetch(
          'https://api.hubapi.com/crm/v3/objects/deals/batch/read',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: allPropNames,
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
          allDealProperties = allDeals.map((d: { id: string; properties: Record<string, string> }) => ({
            id: d.id,
            properties: d.properties,
          }));

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
            upcomingDeal = upcoming[0].properties;
            const contact = await getDealContact(upcoming[0].id);
            if (contact?.firstname) {
              contactName = contact.firstname;
            }
          }

          if (past.length > 0) {
            lastDeal = past[0].properties;
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
      debug: {
        allCompanyProperties,
        allDeals: allDealProperties,
      },
    });

  } catch (error) {
    console.error('HubSpot lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
