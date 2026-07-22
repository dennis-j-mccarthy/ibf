import { NextRequest, NextResponse } from 'next/server';

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'doc', 'docx'];

// Find a company by exact domain match (same strategy as /api/hubspot/lookup)
async function findCompanyByDomain(website: string): Promise<{ id: string; name: string } | null> {
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

  const domainWithoutWww = domain.replace(/^www\./, '');
  const domainWithWww = domain.startsWith('www.') ? domain : `www.${domain}`;
  const bases = [domain, domainWithoutWww, domainWithWww];
  const exactCandidates = new Set([
    ...bases,
    ...bases.map(d => `https://${d}`),
    ...bases.map(d => `https://${d}/`),
    ...bases.map(d => `http://${d}`),
    ...bases.map(d => `http://${d}/`),
  ]);

  for (const value of exactCandidates) {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value }] }],
        properties: ['name', 'domain'],
      }),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.results?.length > 0) {
        return { id: result.results[0].id, name: result.results[0].properties.name };
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'HubSpot not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const website = (formData.get('website') as string | null)?.trim();
    const file = formData.get('file') as File | null;

    if (!website) {
      return NextResponse.json({ error: 'School or organization website is required.' }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'A document is required.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is too large (10 MB max).' }, { status: 400 });
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, image, or Word document.' }, { status: 400 });
    }

    console.log('\n========== Tax Document Upload ==========');
    console.log('Website:', website, '| File:', file.name, `(${file.size} bytes)`);

    // 1. Match the domain to a company — disallow if no match
    const company = await findCompanyByDomain(website);
    if (!company) {
      console.log('No company match — upload disallowed');
      return NextResponse.json(
        { error: 'We could not find your school or organization. Please check the website address, or contact your Book Fair Manager.' },
        { status: 404 }
      );
    }
    console.log('Matched company:', company.name, '(ID:', company.id, ')');

    // 2. Upload the file to HubSpot Files
    const uploadForm = new FormData();
    uploadForm.append('file', file, file.name);
    uploadForm.append('folderPath', '/tax-exempt-certificates');
    uploadForm.append('options', JSON.stringify({ access: 'PUBLIC_NOT_INDEXABLE', overwrite: false }));

    const uploadResponse = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
      body: uploadForm,
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      console.log('File upload failed:', uploadResponse.status, detail);
      return NextResponse.json({ error: 'Upload to HubSpot failed. Please try again or contact your Book Fair Manager.' }, { status: 502 });
    }
    const uploadedFile = await uploadResponse.json();
    console.log('Uploaded file ID:', uploadedFile.id, '| URL:', uploadedFile.url);

    // 3. Set the company's tax_exempt_form property to the file URL
    const patchResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/companies/${company.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: { tax_exempt_form: uploadedFile.url } }),
    });
    if (!patchResponse.ok) {
      console.log('Company property update failed:', patchResponse.status, await patchResponse.text());
    }

    // 4. Attach a note with the file to the company record timeline
    const noteResponse = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          hs_timestamp: new Date().toISOString(),
          hs_note_body: `Tax-exempt certificate uploaded via ignatiusbookfairs.com/upload-tax-document (${file.name})`,
          hs_attachment_ids: String(uploadedFile.id),
        },
        associations: [{
          to: { id: company.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 190 }], // note -> company
        }],
      }),
    });
    if (!noteResponse.ok) {
      console.log('Note creation failed:', noteResponse.status, await noteResponse.text());
    }

    console.log('=========================================\n');
    return NextResponse.json({ success: true, companyName: company.name });
  } catch (error) {
    console.error('Tax document upload error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
