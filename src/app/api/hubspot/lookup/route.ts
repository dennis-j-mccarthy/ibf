import { NextRequest, NextResponse } from 'next/server';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Mapping of HubSpot owner IDs to their info and booking URLs
// You can find owner IDs in HubSpot under Settings > Users & Teams
const OWNER_INFO: Record<string, { firstName: string; lastName: string; bookingUrl: string }> = {
  '681153152': { firstName: 'Alma', lastName: 'Cue', bookingUrl: 'https://meetings.hubspot.com/alma-cue' },
  '1438738471': { firstName: 'Jeanette', lastName: 'Pohl', bookingUrl: 'https://meetings.hubspot.com/jeanette-pohl1/ignatius-book-fair' },
  // Add Kim's owner ID when you find it:
  // 'KIM_OWNER_ID': { firstName: 'Kim', lastName: 'Neumaier', bookingUrl: 'https://meetings.hubspot.com/kneumaier/ignatius-book-fair' },
};

export async function POST(request: NextRequest) {
  try {
    const { email, website } = await request.json();

    if (!email && !website) {
      return NextResponse.json({ error: 'Email or website required' }, { status: 400 });
    }

    if (!HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'HubSpot not configured' }, { status: 500 });
    }

    let contactData = null;
    let companyData = null;

    // Search for contact by email
    let contactId = null;
    if (email) {
      const contactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }],
          }],
          properties: ['firstname', 'lastname', 'email', 'company', 'phone'],
        }),
      });

      if (contactResponse.ok) {
        const contactResult = await contactResponse.json();
        if (contactResult.results && contactResult.results.length > 0) {
          contactData = contactResult.results[0].properties;
          contactId = contactResult.results[0].id;
        }
      }
    }

    let companyId = null;

    // Search for company by domain
    if (website) {
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
              value: domain,
            }],
          }],
          properties: ['name', 'domain', 'city', 'state', 'numberofemployees', 'notes_last_updated', 'hubspot_owner_id'],
        }),
      });

      if (companyResponse.ok) {
        const companyResult = await companyResponse.json();
        if (companyResult.results && companyResult.results.length > 0) {
          companyData = companyResult.results[0].properties;
          companyId = companyResult.results[0].id;
        }
      }
    }

    // If no company found by domain but we have a contact, try to get company via contact association
    if (!companyId && contactId) {
      const contactCompanyResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/companies`,
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          },
        }
      );

      if (contactCompanyResponse.ok) {
        const contactCompanyResult = await contactCompanyResponse.json();
        if (contactCompanyResult.results && contactCompanyResult.results.length > 0) {
          // Get the first associated company
          const associatedCompanyId = contactCompanyResult.results[0].id;

          // Fetch company details
          const companyDetailsResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/companies/${associatedCompanyId}?properties=name,domain,city,state,hubspot_owner_id`,
            {
              headers: {
                'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
              },
            }
          );

          if (companyDetailsResponse.ok) {
            const companyDetailsResult = await companyDetailsResponse.json();
            companyData = companyDetailsResult.properties;
            companyId = companyDetailsResult.id;
          }
        }
      }
    }

    // Get owner info from our mapping using the owner ID
    let ownerData = null;
    let bookingUrl = null;
    const debugInfo: Record<string, unknown> = {};

    debugInfo.hasCompanyData = !!companyData;
    debugInfo.hubspot_owner_id = companyData?.hubspot_owner_id || 'NOT FOUND';

    if (companyData?.hubspot_owner_id) {
      const ownerInfo = OWNER_INFO[companyData.hubspot_owner_id];
      debugInfo.ownerInfo = ownerInfo || 'No mapping found for this owner ID';

      if (ownerInfo) {
        ownerData = {
          firstName: ownerInfo.firstName,
          lastName: ownerInfo.lastName,
        };
        bookingUrl = ownerInfo.bookingUrl;
      }
    }

    // Fetch associated deals if we found a company
    let lastDeal = null;
    debugInfo.companyId = companyId || 'NOT FOUND';

    if (companyId) {
      // Get deals associated with this company
      const dealsResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/deals`,
        {
          headers: {
            'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          },
        }
      );

      debugInfo.dealsResponseStatus = dealsResponse.status;

      if (dealsResponse.ok) {
        const dealsResult = await dealsResponse.json();
        debugInfo.dealsResult = dealsResult;
        debugInfo.dealCount = dealsResult.results?.length || 0;

        if (dealsResult.results && dealsResult.results.length > 0) {
          // Get the deal IDs
          const dealIds = dealsResult.results.map((r: { id: string }) => r.id);
          debugInfo.dealIds = dealIds;

          // Fetch deal details for all associated deals
          const dealDetailsResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals/batch/read`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: ['dealname', 'closedate', 'dealstage', 'amount', 'fair_date'],
                inputs: dealIds.map((id: string) => ({ id })),
              }),
            }
          );

          debugInfo.dealDetailsResponseStatus = dealDetailsResponse.status;

          if (dealDetailsResponse.ok) {
            const dealDetailsResult = await dealDetailsResponse.json();
            debugInfo.dealDetailsResult = dealDetailsResult;

            if (dealDetailsResult.results && dealDetailsResult.results.length > 0) {
              // Sort by closedate descending to get the most recent
              const sortedDeals = dealDetailsResult.results.sort((a: { properties: { closedate?: string } }, b: { properties: { closedate?: string } }) => {
                const dateA = a.properties.closedate ? new Date(a.properties.closedate).getTime() : 0;
                const dateB = b.properties.closedate ? new Date(b.properties.closedate).getTime() : 0;
                return dateB - dateA;
              });
              lastDeal = sortedDeals[0].properties;
              debugInfo.lastDeal = lastDeal;
            }
          } else {
            const errorText = await dealDetailsResponse.text();
            debugInfo.dealDetailsError = errorText;
          }
        }
      } else {
        const errorText = await dealsResponse.text();
        debugInfo.dealsError = errorText;
      }
    }

    // Return found data
    if (contactData || companyData) {
      return NextResponse.json({
        found: true,
        contact: contactData,
        company: companyData,
        lastDeal: lastDeal,
        owner: ownerData,
        bookingUrl: bookingUrl,
        debug: debugInfo,
      });
    }

    return NextResponse.json({ found: false });

  } catch (error) {
    console.error('HubSpot lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
