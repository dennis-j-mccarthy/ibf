import { NextRequest, NextResponse } from 'next/server';
import { isTestModeEnabled } from '@/lib/testMode';

const HUBSPOT_PORTAL_ID = '44239293';
// Form 1: Contact form (Step 1 - contact info: name, email, phone, etc.)
const HUBSPOT_FORM1_CONTACT = 'a4499abe-f706-4998-ae0a-8cc5f2758a82';
// Form 2: Company/Organization form (Step 2 - org info: name, address, type, etc.)
const HUBSPOT_FORM2_COMPANY = '182c9a4b-7978-4d15-91a6-22b883deeeab';

interface FormField {
  name: string;
  value: string | number | boolean;
}

async function submitToHubSpotForm(formId: string, fields: FormField[], context: { pageUri?: string; pageName?: string }) {
  // TEST MODE: Log data instead of sending to HubSpot
  if (isTestModeEnabled()) {
    console.log('\n========== TEST MODE: HubSpot Form Submission ==========');
    console.log('Form ID:', formId);
    console.log('Context:', context);
    console.log('Fields:');
    fields.forEach(f => console.log(`  ${f.name}: ${f.value}`));
    console.log('=========================================================\n');
    return { testMode: true, message: 'Data logged to console (not sent to HubSpot)' };
  }

  const requestBody = {
    fields,
    context: {
      pageUri: context.pageUri || 'https://ignatiusbookfairs.com',
      pageName: context.pageName || 'Book Fair Inquiry',
    },
  };

  console.log('\n========== HubSpot API Request ==========');
  console.log('URL:', `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formId}`);
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('==========================================\n');

  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  const responseText = await response.text();
  console.log('\n========== HubSpot API Response ==========');
  console.log('Status:', response.status);
  console.log('Response:', responseText);
  console.log('==========================================\n');

  if (!response.ok) {
    console.error('HubSpot form submission error:', responseText);
    throw new Error(`HubSpot submission failed: ${response.status}`);
  }

  // Try to parse as JSON, but return the text if it fails
  try {
    return JSON.parse(responseText);
  } catch {
    return { raw: responseText };
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { step, formData } = data;

    // Debug logging
    console.log('\n========== HubSpot Submit API Called ==========');
    console.log('Step:', step);
    console.log('FormData received:', JSON.stringify(formData, null, 2));
    console.log('===============================================\n');

    // Step 1: Submit to Form 1 - Contact form (a4499abe)
    if (step === 1 || step === 'contact') {
      const contactFields: FormField[] = [
        { name: 'firstname', value: formData.firstName || '' },
        { name: 'lastname', value: formData.lastName || '' },
        { name: 'email', value: formData.email || '' },
        { name: 'phone', value: formData.phone || '' },
        { name: 'how_did_you_hear_about_us', value: formData.howDidYouHear || '' },
        { name: 'message', value: formData.comments || '' },
      ].filter(f => f.value !== '');

      const result = await submitToHubSpotForm(HUBSPOT_FORM1_CONTACT, contactFields, {
        pageUri: formData.pageUri,
        pageName: 'Book Fair Inquiry - Contact Info',
      });

      return NextResponse.json({ success: true, step: 1, result });
    }

    // Step 2: Submit to Form 2 - Company/Organization form (182c9a4b)
    // NOTE: This form must be configured in HubSpot to create Company records
    // The objectTypeId for Company is 0-2, so Company properties need the 0-2/ prefix
    if (step === 2 || step === 'company') {
      const companyFields: FormField[] = [
        // Email for contact association (Contact property - no prefix)
        { name: 'email', value: formData.email || '' },

        // Company properties need objectTypeId-index/propertyName format
        // objectTypeId 0-2 = Company, index 0 = first company in form
        { name: '0-2/name', value: formData.orgName || '' },
        { name: '0-2/address', value: formData.address1 || '' },
        { name: '0-2/city', value: formData.city || '' },
        { name: '0-2/state', value: formData.state || '' },
        { name: '0-2/zip', value: formData.zip || '' },
        { name: '0-2/domain', value: formData.website || '' },
        { name: '0-2/type', value: formData.orgType || '' },
        { name: '0-2/select_diocese', value: formData.diocese || '' },

        // Organization questions (Company properties)
        { name: '0-2/do_you_rep', value: formData.representsOrg === 'Yes' ? 'true' : 'false' },
        { name: '0-2/org_role', value: formData.roleInOrg || '' },

        // School fields (Company properties)
        { name: '0-2/school', value: formData.orgType === 'School' ? 'Yes' : 'No' },
        { name: '0-2/school_type', value: formData.schoolType || '' },
        { name: '0-2/grade_levels', value: formData.gradeLevels || '' },
        { name: '0-2/students_enrolled', value: formData.studentsEnrolled || '' },

        // Book fair preferences (Company properties)
        { name: '0-2/previously_hosted_book_fairs', value: formData.hasHostedBefore || '' },
        { name: '0-2/preferred_book_fair_date_1', value: formData.preferredSeason || '' },
      ].filter(f => f.value !== '' && f.value !== 'false');

      const result = await submitToHubSpotForm(HUBSPOT_FORM2_COMPANY, companyFields, {
        pageUri: formData.pageUri,
        pageName: 'Book Fair Inquiry - Organization Info',
      });

      return NextResponse.json({ success: true, step: 2, result });
    }

    // Submit both forms at once
    if (step === 'both') {
      // Form 1 (Contact form - a4499abe) fields
      const contactFields: FormField[] = [
        { name: 'firstname', value: formData.firstName || '' },
        { name: 'lastname', value: formData.lastName || '' },
        { name: 'email', value: formData.email || '' },
        { name: 'phone', value: formData.phone || '' },
        { name: 'how_did_you_hear_about_us', value: formData.howDidYouHear || '' },
        { name: 'message', value: formData.comments || '' },
      ].filter(f => f.value !== '');

      // Form 2 (Company form - 182c9a4b) fields
      const companyFields: FormField[] = [
        // Email for contact association (Contact property - no prefix)
        { name: 'email', value: formData.email || '' },

        // Company properties need objectTypeId-index/propertyName format
        { name: '0-2/name', value: formData.orgName || '' },
        { name: '0-2/address', value: formData.address1 || '' },
        { name: '0-2/city', value: formData.city || '' },
        { name: '0-2/state', value: formData.state || '' },
        { name: '0-2/zip', value: formData.zip || '' },
        { name: '0-2/domain', value: formData.website || '' },
        { name: '0-2/type', value: formData.orgType || '' },
        { name: '0-2/select_diocese', value: formData.diocese || '' },

        // Organization questions (Company properties)
        { name: '0-2/do_you_rep', value: formData.representsOrg === 'Yes' ? 'true' : 'false' },
        { name: '0-2/org_role', value: formData.roleInOrg || '' },

        // School fields (Company properties)
        { name: '0-2/school', value: formData.orgType === 'School' ? 'Yes' : 'No' },
        { name: '0-2/school_type', value: formData.schoolType || '' },
        { name: '0-2/grade_levels', value: formData.gradeLevels || '' },
        { name: '0-2/students_enrolled', value: formData.studentsEnrolled || '' },

        // Book fair preferences (Company properties)
        { name: '0-2/previously_hosted_book_fairs', value: formData.hasHostedBefore || '' },
        { name: '0-2/preferred_book_fair_date_1', value: formData.preferredSeason || '' },
      ].filter(f => f.value !== '' && f.value !== 'false');

      // Submit both forms
      const [contactResult, companyResult] = await Promise.all([
        submitToHubSpotForm(HUBSPOT_FORM1_CONTACT, contactFields, {
          pageUri: formData.pageUri,
          pageName: 'Book Fair Inquiry - Contact Info',
        }),
        submitToHubSpotForm(HUBSPOT_FORM2_COMPANY, companyFields, {
          pageUri: formData.pageUri,
          pageName: 'Book Fair Inquiry - Organization Info',
        }),
      ]);

      return NextResponse.json({
        success: true,
        step: 'both',
        results: { contact: contactResult, company: companyResult }
      });
    }

    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 500 }
    );
  }
}
