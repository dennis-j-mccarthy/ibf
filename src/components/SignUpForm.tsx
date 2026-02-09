'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackFunnelEvent, getRepName } from '@/lib/analytics';

interface HubSpotData {
  found: boolean;
  contact?: {
    firstname?: string;
    lastname?: string;
    company?: string;
  };
  company?: {
    name?: string;
    city?: string;
    state?: string;
  };
  lastDeal?: {
    dealname?: string;
    closedate?: string;
    dealstage?: string;
    amount?: string;
    fair_date?: string;
  };
  owner?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  bookingUrl?: string;
}

// US States for dropdown
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Diocese list (full list from Webflow)
const DIOCESES = [
  "Albany", "Alexandria", "Allentown", "Altoona-Johnstown", "Amarillo",
  "Anchorage", "Arlington", "Atlanta", "Austin", "Baker",
  "Baltimore", "Baton Rouge", "Beaumont", "Belleville", "Biloxi",
  "Birmingham", "Bismarck", "Boise", "Boston", "Bridgeport",
  "Brooklyn", "Brownsville", "Buffalo", "Burlington", "Camden",
  "Charleston", "Charlotte", "Cheyenne", "Chicago", "Cincinnati",
  "Cleveland", "Colorado Springs", "Columbus", "Corpus Christi",
  "Covington", "Crookston", "Dallas", "Davenport", "Denver",
  "Des Moines", "Detroit", "Dodge City", "Dubuque", "Duluth",
  "El Paso", "Erie", "Evansville", "Fairbanks", "Fall River",
  "Fargo", "Fort Wayne-South Bend", "Fort Worth", "Fresno",
  "Gallup", "Galveston-Houston", "Gary", "Gaylord", "Grand Island",
  "Grand Rapids", "Great Falls-Billings", "Green Bay", "Greensburg",
  "Harrisburg", "Hartford", "Helena", "Honolulu", "Houma-Thibodaux",
  "Indianapolis", "Jackson", "Jefferson City", "Joliet", "Juneau",
  "Kalamazoo", "Kansas City", "Kansas City-St. Joseph", "Knoxville",
  "La Crosse", "Lafayette", "Lake Charles", "Lansing", "Laredo",
  "Las Cruces", "Las Vegas", "Lexington", "Lincoln", "Little Rock",
  "Los Angeles", "Louisville", "Lubbock", "Madison", "Manchester",
  "Marquette", "Memphis", "Metuchen", "Miami", "Military Services, U.S.A.",
  "Milwaukee", "Mobile", "Monterey", "Nashville", "New Orleans",
  "New Ulm", "New York", "Newark", "Norwich", "Oakland",
  "Ogdensburg", "Oklahoma City", "Omaha", "Orange", "Orlando",
  "Owensboro", "Palm Beach", "Paterson", "Pensacola-Tallahassee",
  "Peoria", "Philadelphia", "Phoenix", "Pittsburgh", "Portland",
  "Providence", "Pueblo", "Raleigh", "Rapid City", "Reno",
  "Richmond", "Rochester", "Rockford", "Rockville Centre", "Sacramento",
  "Saginaw", "Salina", "Salt Lake City", "San Angelo", "San Antonio",
  "San Bernardino", "San Diego", "San Francisco", "San Jose",
  "Santa Fe", "Santa Rosa", "Savannah", "Scranton", "Seattle",
  "Shreveport", "Sioux City", "Sioux Falls", "Spokane", "Springfield",
  "St. Augustine", "St. Cloud", "St. Louis", "St. Paul-Minneapolis",
  "St. Petersburg", "Steubenville", "Stockton", "Superior", "Syracuse",
  "Toledo", "Trenton", "Tucson", "Tulsa", "Tyler", "Venice",
  "Victoria", "Washington", "Wheeling-Charleston", "Wichita",
  "Wilmington", "Winona", "Worcester", "Yakima", "Youngstown"
];

// State abbreviations for rep assignment logic
const STATE_ABBREVS: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Rep assignment regions based on territory map
// Northeast - Julie
const NORTHEAST_STATES = ['ME', 'NH', 'VT', 'MA', 'CT', 'RI', 'NY', 'PA', 'NJ', 'DE', 'MD', 'DC'];
// Northwest - Jeanette
const NORTHWEST_STATES = ['WA', 'OR', 'ID', 'MT', 'WY', 'ND', 'SD', 'MN', 'WI', 'MI', 'IA', 'NE', 'IL', 'IN', 'OH'];
// Southeast - Alma
const SOUTHEAST_STATES = ['VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA'];
// Southwest - Alma
const SOUTHWEST_STATES = ['CA', 'NV', 'UT', 'AZ', 'CO', 'NM', 'TX', 'OK', 'KS', 'MO'];
// Alma covers both Southeast and Southwest
const ALMA_STATES = [...SOUTHEAST_STATES, ...SOUTHWEST_STATES];

// HubSpot Meeting Embed URLs
const APPOINTMENT_URLS: Record<string, string> = {
  'julie': 'https://meetings.hubspot.com/julie-degregoria?uuid=f012da76-1f7b-4474-be12-2d6ba4a4524d', // Northeast
  'jeanette': 'https://meetings.hubspot.com/jeanette-pohl1/ignatius-book-fair', // Northwest
  'alma': 'https://meetings.hubspot.com/alma-cue', // Southeast & Southwest
  'marni': '', // TODO: Add Marni's booking URL - handles all Public schools
  'kim': 'https://meetings.hubspot.com/kneumaier/ignatius-book-fair', // All Diocese
};

// Determine which rep/appointment page based on org type, school type, affiliation, and state
function getAppointmentRedirect(orgType: string, schoolType: string, state: string, affiliation?: string): string | null {
  const orgLower = orgType.toLowerCase();
  const schoolLower = schoolType.toLowerCase();
  const affiliationLower = (affiliation || '').toLowerCase();
  const stateAbbrev = STATE_ABBREVS[state] || state.toUpperCase();

  // Special case: All Public schools -> Marni
  if (schoolLower === 'public') {
    return APPOINTMENT_URLS['marni'] || null; // Return null if URL not set yet
  }

  // Special case: All Diocese -> Kim
  if (orgLower === 'diocese') {
    return APPOINTMENT_URLS['kim'] || null; // Return null if URL not set yet
  }

  // For Catholic organizations (Private Catholic, Homeschool Catholic, Parish) -> Geographic split
  // Also handle Business and other non-public school types
  const isCatholic = affiliationLower === 'catholic' || orgLower === 'parish';
  const needsGeographicRouting =
    isCatholic ||
    orgLower === 'business' ||
    schoolLower === 'private' ||
    ['home school', 'homeschool', 'home-school'].includes(schoolLower);

  if (needsGeographicRouting) {
    // Northeast -> Julie
    if (NORTHEAST_STATES.includes(stateAbbrev)) {
      return APPOINTMENT_URLS['julie'];
    }
    // Northwest -> Jeanette
    if (NORTHWEST_STATES.includes(stateAbbrev)) {
      return APPOINTMENT_URLS['jeanette'];
    }
    // Southeast & Southwest -> Alma
    if (ALMA_STATES.includes(stateAbbrev)) {
      return APPOINTMENT_URLS['alma'];
    }
    // Alaska and Hawaii - default to Alma (closest to West coast)
    if (['AK', 'HI'].includes(stateAbbrev)) {
      return APPOINTMENT_URLS['alma'];
    }
  }

  return null; // No match - don't redirect
}

const SignUpForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [appointmentUrl, setAppointmentUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Step 1 - Contact Info
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howDidYouHear: '',
    comments: '',
    previouslyHadFair: null as boolean | null, // null = not answered yet, true = yes, false = no
    rebookEmail: '',
    rebookPhone: '',
    rebookWebsite: '',

    // Step 2 - Organization Info
    representsOrg: '', // Yes, No
    roleInOrg: '', // dropdown
    hasHostedBefore: '', // Yes, No, Unsure
    preferredSeason: '', // Spring 2026, Summer 2026, Fall 2026

    orgName: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    website: '',
    orgType: '', // School, Parish, Diocese, Other
    smsConsent: false,

    // School-specific fields (conditional)
    schoolType: '', // Public, Private, Home school
    affiliation: '', // Catholic, Christian, Independent (for Private) or Non Charter, Other (for Public)
    principalFirstName: '',
    principalLastName: '',
    principalEmail: '',
    principalPhone: '',
    studentsEnrolled: '',
    gradeLevels: '',
    diocese: '',

    // Previous sales (for returning customers)
    previousSales: '',
  });

  const [hubspotData, setHubspotData] = useState<HubSpotData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hubspotTestMode, setHubspotTestMode] = useState(false);

  // Fetch HubSpot test mode status in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    fetch('/api/hubspot/test-mode')
      .then(res => res.json())
      .then(data => setHubspotTestMode(data.testMode))
      .catch(() => {});
  }, []);

  // Toggle HubSpot test mode
  const toggleTestMode = async () => {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      const res = await fetch('/api/hubspot/test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !hubspotTestMode }),
      });
      const data = await res.json();
      setHubspotTestMode(data.testMode);
    } catch (err) {
      console.error('Failed to toggle test mode:', err);
    }
  };

  // Dev-only: Auto-fill form with test data using keyboard shortcuts
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Option+Ctrl+1: Fill step 1
      if (e.altKey && e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setFormData(prev => ({
          ...prev,
          salutation: 'Mr.',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '555-123-4567',
          howDidYouHear: 'Referral',
          comments: 'This is a test submission.',
        }));
        console.log('[DEV] Form step 1 auto-filled');
      }

      // Option+Ctrl+2: Fill step 2 (Catholic Private School - Southern)
      if (e.altKey && e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setFormData(prev => ({
          ...prev,
          representsOrg: 'Yes',
          roleInOrg: 'Administrator',
          hasHostedBefore: 'No',
          preferredSeason: 'Fall 2026',
          orgName: 'St. Mary Catholic School',
          address1: '123 Main Street',
          address2: 'Suite 100',
          city: 'Austin',
          state: 'Texas',
          zip: '78701',
          website: 'www.stmarycatholic.edu',
          orgType: 'School',
          schoolType: 'Private',
          affiliation: 'Catholic',
          studentsEnrolled: '450',
          gradeLevels: 'PK-5',
          diocese: 'Austin',
          principalFirstName: 'Sister',
          principalLastName: 'Margaret',
          principalEmail: 'principal@stmarycatholic.edu',
          principalPhone: '555-987-6543',
          smsConsent: true,
        }));
        console.log('[DEV] Form step 2 auto-filled (Catholic Private School - Southern → Jeanette)');
      }

      // Option+Ctrl+3: Fill step 2 (Public School - routes to Alma)
      if (e.altKey && e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setFormData(prev => ({
          ...prev,
          representsOrg: 'Yes',
          roleInOrg: 'Teacher',
          hasHostedBefore: 'Yes',
          preferredSeason: 'Spring 2026',
          orgName: 'Lincoln Elementary',
          address1: '456 Oak Avenue',
          address2: '',
          city: 'Chicago',
          state: 'Illinois',
          zip: '60601',
          website: 'www.lincolnelementary.edu',
          orgType: 'School',
          schoolType: 'Public',
          affiliation: 'Non Charter',
          studentsEnrolled: '600',
          gradeLevels: 'K-12',
          diocese: '',
          principalFirstName: 'John',
          principalLastName: 'Smith',
          principalEmail: 'jsmith@lincolnelementary.edu',
          principalPhone: '555-111-2222',
          smsConsent: false,
        }));
        console.log('[DEV] Form step 2 auto-filled (Public School → Alma)');
      }

      // Option+Ctrl+4: Fill step 2 (Parish - Northern)
      if (e.altKey && e.ctrlKey && e.key === '4') {
        e.preventDefault();
        setFormData(prev => ({
          ...prev,
          representsOrg: 'Yes',
          roleInOrg: 'Pastor',
          hasHostedBefore: 'Unsure',
          preferredSeason: 'Summer 2026',
          orgName: 'St. Patrick Parish',
          address1: '789 Church Street',
          address2: '',
          city: 'Boston',
          state: 'Massachusetts',
          zip: '02101',
          website: 'www.stpatrickboston.org',
          orgType: 'Parish',
          schoolType: '',
          affiliation: '',
          studentsEnrolled: '1200',
          gradeLevels: '',
          diocese: 'Boston',
          principalFirstName: '',
          principalLastName: '',
          principalEmail: '',
          principalPhone: '',
          smsConsent: true,
        }));
        console.log('[DEV] Form step 2 auto-filled (Parish - Northern → K Neumaier)');
      }

      // Option+Ctrl+5: Fill step 2 (Diocese - routes to Alma)
      if (e.altKey && e.ctrlKey && e.key === '5') {
        e.preventDefault();
        setFormData(prev => ({
          ...prev,
          representsOrg: 'Yes',
          roleInOrg: 'Administrator',
          hasHostedBefore: 'No',
          preferredSeason: 'Fall 2026',
          orgName: 'Diocese of San Antonio',
          address1: '2718 W Woodlawn Ave',
          address2: '',
          city: 'San Antonio',
          state: 'Texas',
          zip: '78228',
          website: 'www.archsa.org',
          orgType: 'Diocese',
          schoolType: '',
          affiliation: '',
          studentsEnrolled: '',
          gradeLevels: '',
          diocese: 'San Antonio',
          principalFirstName: '',
          principalLastName: '',
          principalEmail: '',
          principalPhone: '',
          smsConsent: true,
        }));
        console.log('[DEV] Form step 2 auto-filled (Diocese → Alma)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lookup HubSpot data when email or website changes (for returning customers)
  const lookupHubSpot = useCallback(async (email: string, website: string) => {
    if (!email && !website) {
      setHubspotData(null);
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await fetch('/api/hubspot/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      });

      if (response.ok) {
        const data = await response.json();
        setHubspotData(data);
      }
    } catch (error) {
      console.error('HubSpot lookup error:', error);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Debounce the lookup for returning customers
  useEffect(() => {
    if (formData.previouslyHadFair !== true) return;

    const timer = setTimeout(() => {
      if (formData.rebookEmail || formData.rebookWebsite) {
        lookupHubSpot(formData.rebookEmail, formData.rebookWebsite);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.rebookEmail, formData.rebookWebsite, formData.previouslyHadFair, lookupHubSpot]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Submit Step 1 to HubSpot Contact form
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/hubspot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          formData: {
            ...formData,
            pageUri: window.location.href,
          }
        }),
      });

      if (response.ok) {
        // Track step 1 completion
        trackFunnelEvent('form_step1_completed', {
          howDidYouHear: formData.howDidYouHear,
        });
        setCurrentStep(2);
        trackFunnelEvent('form_step2_started');
      } else {
        console.error('Step 1 submission failed');
        // Still allow proceeding to step 2
        trackFunnelEvent('form_step1_completed', { hadError: true });
        setCurrentStep(2);
        trackFunnelEvent('form_step2_started');
      }
    } catch (error) {
      console.error('Step 1 submission error:', error);
      // Still allow proceeding to step 2
      trackFunnelEvent('form_step1_completed', { hadError: true });
      setCurrentStep(2);
      trackFunnelEvent('form_step2_started');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/hubspot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 2,
          formData: {
            ...formData,
            pageUri: window.location.href,
          }
        }),
      });

      if (response.ok) {
        // Determine appointment URL based on org type, school type, and state
        const baseAppointmentUrl = getAppointmentRedirect(formData.orgType, formData.schoolType, formData.state, formData.affiliation);

        if (baseAppointmentUrl) {
          // Build prefilled URL with contact info
          // HubSpot meetings supports: firstName, lastName, email, phone, company
          // and custom fields via their internal field names
          const params = new URLSearchParams();

          // Standard contact fields
          if (formData.firstName) params.set('firstName', formData.firstName);
          if (formData.lastName) params.set('lastName', formData.lastName);
          if (formData.email) params.set('email', formData.email);
          if (formData.phone) params.set('phone', formData.phone);
          if (formData.orgName) params.set('company', formData.orgName);

          // Additional fields that may be supported
          if (formData.city) params.set('city', formData.city);
          if (formData.state) params.set('state', formData.state);
          if (formData.zip) params.set('zip', formData.zip);
          if (formData.website) params.set('website', formData.website);

          // Organization-specific fields
          if (formData.orgType) params.set('type_of_organization', formData.orgType);
          if (formData.schoolType) params.set('school_type', formData.schoolType);
          if (formData.affiliation) params.set('affiliation', formData.affiliation);
          if (formData.diocese) params.set('diocese', formData.diocese);
          if (formData.studentsEnrolled) params.set('students_enrolled', formData.studentsEnrolled);
          if (formData.gradeLevels) params.set('grade_levels', formData.gradeLevels);

          const prefilledUrl = `${baseAppointmentUrl}?${params.toString()}`;
          setAppointmentUrl(prefilledUrl);

          // Track step 2 completion with appointment
          trackFunnelEvent('form_step2_completed', {
            orgType: formData.orgType,
            schoolType: formData.schoolType,
            state: formData.state,
            hasAppointment: true,
          });
          trackFunnelEvent('appointment_shown', {
            rep: getRepName(prefilledUrl),
            orgType: formData.orgType,
            schoolType: formData.schoolType,
            state: formData.state,
          });
        } else {
          setAppointmentUrl(null);
          // Track step 2 completion without appointment
          trackFunnelEvent('form_step2_completed', {
            orgType: formData.orgType,
            schoolType: formData.schoolType,
            state: formData.state,
            hasAppointment: false,
          });
        }

        setSubmitSuccess(true);
      } else {
        alert('There was an error submitting your information. Please try again.');
      }
    } catch (error) {
      console.error('Step 2 submission error:', error);
      alert('There was an error submitting your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load HubSpot meetings embed script when appointmentUrl is set
  useEffect(() => {
    if (submitSuccess && appointmentUrl) {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="MeetingsEmbedCode"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
        script.async = true;
        document.body.appendChild(script);
      } else {
        // If script exists, trigger a re-render of the meetings widget
        // by dispatching a custom event or calling the HubSpot API
        if (typeof window !== 'undefined' && (window as unknown as { hbspt?: { meetings?: { create?: () => void } } }).hbspt?.meetings?.create) {
          (window as unknown as { hbspt: { meetings: { create: () => void } } }).hbspt.meetings.create();
        }
      }
    }
  }, [submitSuccess, appointmentUrl]);

  // Success state
  if (submitSuccess) {
    return (
      <section id="signup" className="relative py-16 md:py-24 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/header-blob2.png')" }}
      >
        <div className="max-w-[850px] mx-auto px-4">
          <div className="bg-white/90 rounded-md border border-[#0087ff] p-10 md:p-12 text-center">
            <div className="w-20 h-20 bg-[#50db92] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[#0088ff] text-3xl mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              Thank You!
            </h2>
            <p className="text-gray-700 text-lg mb-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              Your inquiry has been submitted successfully.
              {appointmentUrl ? ' Schedule a call with one of our Book Fair Pros below!' : ' One of our Book Fair Pros will be in touch with you soon!'}
            </p>

            {/* HubSpot Meetings Embed */}
            {appointmentUrl && (
              <div className="mt-6">
                <div
                  className="meetings-iframe-container"
                  data-src={`${appointmentUrl}&embed=true`}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Show test mode banner in development
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <section id="signup" className={`relative overflow-hidden transition-all duration-500 ${formData.previouslyHadFair === null && currentStep === 1 ? 'py-8' : 'py-16 md:py-24'}`}>
      {/* Background image in absolute div - gets clipped by overflow-hidden */}
      <div
        className="absolute inset-0 bg-contain bg-top bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/images/header-blob2.png')" }}
      />
      <div className="max-w-[850px] mx-auto px-4 relative z-10">
        {/* Test Mode Banner - clickable to toggle */}
        {isDev && (
          <button
            onClick={toggleTestMode}
            className={`w-full text-center py-2 px-4 rounded-t-md font-bold text-sm cursor-pointer transition-colors ${
              hubspotTestMode
                ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                : 'bg-green-500 text-white hover:bg-green-400'
            }`}
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            {hubspotTestMode
              ? '🧪 TEST MODE ON - Click to send to HubSpot'
              : '✅ LIVE MODE - Click to enable test mode'}
          </button>
        )}
        <div className={`bg-white/90 ${isDev ? 'rounded-b-md border-x border-b' : 'rounded-md border'} border-[#0087ff] transition-all duration-500 ${formData.previouslyHadFair === null && currentStep === 1 ? 'p-6 md:p-8' : 'p-10 md:p-12'}`}>
          {/* Header */}
          <div className={`text-center transition-all duration-500 ${formData.previouslyHadFair === null && currentStep === 1 ? 'mb-4' : 'mb-8'}`}>
            <h1
              className="text-[#0088ff] mb-[20px] text-[35px]"
              style={{ fontFamily: "brother-1816, sans-serif", lineHeight: '90%' }}
            >
              {currentStep === 1 ? (
                <>Inquire about an<br />Ignatius Book Fair</>
              ) : (
                <>About Your<br />Organization</>
              )}
            </h1>
            <p
              className="text-gray-700 text-sm md:text-base max-w-[77%] mx-auto"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              {currentStep === 1 ? (
                'Interested in hosting a book fair? Fill out this form and one of our Book Fair Pros will be in touch with all the details you need!'
              ) : (
                'Tell us more about your organization so we can better serve you.'
              )}
            </p>

          </div>

          {/* First Question: Have you previously had an Ignatius Book Fair? - Always visible on step 1 */}
          {currentStep === 1 && (
            <div className="max-w-lg mx-auto px-4 mb-6">
              <div className="p-5 border-4 border-[#0088ff] rounded-xl bg-gray-50">
                <p className="text-[#0088ff] text-lg font-semibold text-center mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Have you previously had an Ignatius Book Fair?
                </p>
                <div className="flex justify-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="previouslyHadFair"
                      value="yes"
                      checked={formData.previouslyHadFair === true}
                      onChange={() => setFormData(prev => ({ ...prev, previouslyHadFair: true }))}
                      className="w-5 h-5 accent-[#0088ff]"
                    />
                    <span className="text-[#0088ff] font-medium" style={{ fontFamily: 'brother-1816, sans-serif' }}>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="previouslyHadFair"
                      value="no"
                      checked={formData.previouslyHadFair === false}
                      onChange={() => setFormData(prev => ({ ...prev, previouslyHadFair: false }))}
                      className="w-5 h-5 accent-[#0088ff]"
                    />
                    <span className="text-[#0088ff] font-medium" style={{ fontFamily: 'brother-1816, sans-serif' }}>No</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Steps Container with Slide Animation - hidden until radio is selected */}
          <div className={`relative overflow-hidden transition-all duration-500 ${formData.previouslyHadFair === null && currentStep === 1 ? 'max-h-0 opacity-0' : 'max-h-[3000px] opacity-100'}`}>
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(${currentStep === 1 ? '0%' : '-50%'})`, width: '200%' }}
            >
              {/* Step 1: Contact Info */}
              <div className="w-1/2 px-4">
                <form onSubmit={handleStep1Submit} className="max-w-lg mx-auto">

              {/* Returning customer lookup (Yes) - with slide-down animation */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-out ${
                  formData.previouslyHadFair === true ? 'max-h-[2000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm text-center" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                    Enter your email or school website to find your account:
                  </p>
                  <input
                    type="email"
                    name="rebookEmail"
                    placeholder="Email Address"
                    value={formData.rebookEmail}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-300"></div>
                    <span className="text-gray-400 text-sm" style={{ fontFamily: 'brother-1816, sans-serif' }}>or</span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                  <input
                    type="text"
                    name="rebookWebsite"
                    placeholder="School or Organization Website"
                    value={formData.rebookWebsite}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />

                  {/* Welcome message when HubSpot finds the customer */}
                  {hubspotData?.found && (
                    <div className="bg-[#50db92] rounded-lg p-4 text-center text-white">
                      <p className="text-lg font-bold" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                        Welcome back{hubspotData.contact?.firstname ? `, ${hubspotData.contact.firstname}` : ''}!
                      </p>
                      {hubspotData.company?.name && (
                        <p className="text-base" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                          {hubspotData.company.name}
                        </p>
                      )}
                      {hubspotData.company?.city && hubspotData.company?.state && (
                        <p className="text-sm opacity-90" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                          {hubspotData.company.city}, {hubspotData.company.state}
                        </p>
                      )}
                      {hubspotData.lastDeal?.dealname && (
                        <p className="text-sm mt-2 opacity-90" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                          Last fair: {hubspotData.lastDeal.dealname}
                          {(hubspotData.lastDeal.fair_date || hubspotData.lastDeal.closedate) && (
                            <> ({new Date(hubspotData.lastDeal.fair_date || hubspotData.lastDeal.closedate!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})</>
                          )}
                        </p>
                      )}
                      {hubspotData.owner && (
                        <p className="text-sm mt-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                          Your rep: {hubspotData.owner.firstName} {hubspotData.owner.lastName}
                        </p>
                      )}
                    </div>
                  )}

                  {isLookingUp && (
                    <div className="text-center text-[#0088ff]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                      <p className="text-sm">Looking up your information...</p>
                    </div>
                  )}

                  {hubspotData?.bookingUrl && (
                    <div className="mt-4 bg-white rounded-lg overflow-hidden">
                      <iframe
                        src={`${hubspotData.bookingUrl}?embed=true`}
                        width="100%"
                        height="600"
                        className="rounded-lg border-0"
                        title="Book a meeting"
                      />
                    </div>
                  )}

                  {!hubspotData?.bookingUrl && (formData.rebookEmail || formData.rebookWebsite) && !isLookingUp && !hubspotData?.found && (
                    <div className="text-center pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider disabled:opacity-50"
                        style={{ fontFamily: 'brother-1816, sans-serif' }}
                      >
                        {isSubmitting ? 'SUBMITTING...' : 'REBOOK A FAIR >'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* New customer fields (No) - with slide-down animation */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-out ${
                  formData.previouslyHadFair === false ? 'max-h-[3000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'
                }`}
              >
                <div>
                  {/* Salutation, First Name, Last Name */}
                  <div className="grid grid-cols-[100px_1fr_1fr] gap-3 mb-2.5">
                    <select
                      name="salutation"
                      value={formData.salutation}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-3 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Title *</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Miss">Miss</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Fr.">Fr. (Father)</option>
                      <option value="Dcn.">Dcn. (Deacon)</option>
                      <option value="Sr.">Sr. (Sister)</option>
                      <option value="Br.">Br. (Brother)</option>
                      <option value="Pastor">Pastor</option>
                    </select>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name *"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name *"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    />
                  </div>

                  <input
                    type="email"
                    name="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />

                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone *"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />

                  <div className="mb-2.5">
                    <label className="block text-[#0088ff] text-sm mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>How did you hear about us? *</label>
                    <select
                      name="howDidYouHear"
                      value={formData.howDidYouHear}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Select one...</option>
                      <option value="Referral">Referral</option>
                      <option value="Search engine">Search engine</option>
                      <option value="Radio">Radio</option>
                      <option value="Social media">Social media</option>
                      <option value="Event">Event</option>
                      <option value="Email">Email</option>
                      <option value="Contacted by a rep">Contacted by a rep</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="mb-2.5">
                    <label className="block text-[#0088ff] text-sm mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>Comments</label>
                    <textarea
                      name="comments"
                      placeholder="Please share about your interest in Ignatius Book Fairs"
                      value={formData.comments}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide resize-none"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    />
                  </div>

                  <div className="text-center pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider w-auto whitespace-nowrap disabled:opacity-50"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      {isSubmitting ? 'SUBMITTING...' : 'ABOUT YOUR ORGANIZATION >'}
                    </button>
                  </div>
                </div>
              </div>
                </form>
              </div>

              {/* Step 2: Organization Info */}
              <div className="w-1/2 px-4">
                <form onSubmit={handleStep2Submit} className="max-w-lg mx-auto">
              {/* Do you represent an organization? + What is your role? */}
              <div className={`grid gap-4 mb-4 ${formData.representsOrg === 'Yes' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="block text-[#0088ff] text-sm mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                    Do you represent an organization?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="representsOrg"
                        value="Yes"
                        checked={formData.representsOrg === 'Yes'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span style={{ fontFamily: 'brother-1816, sans-serif' }}>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="representsOrg"
                        value="No"
                        checked={formData.representsOrg === 'No'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span style={{ fontFamily: 'brother-1816, sans-serif' }}>No</span>
                    </label>
                  </div>
                </div>

                {formData.representsOrg === 'Yes' && (
                  <div>
                    <label className="block text-[#0088ff] text-sm mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                      What is your role in the organization?
                    </label>
                    <select
                      name="roleInOrg"
                      value={formData.roleInOrg}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Select your role..</option>
                      <option value="Administrator">Administrator</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Parent">Parent</option>
                      <option value="Volunteer">Volunteer</option>
                      <option value="Pastor">Pastor</option>
                      <option value="Principal">Principal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Have you hosted a book fair? + Preferred season */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[#0088ff] text-sm mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                    Have you hosted a book fair?
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasHostedBefore"
                        value="Yes"
                        checked={formData.hasHostedBefore === 'Yes'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span style={{ fontFamily: 'brother-1816, sans-serif' }}>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasHostedBefore"
                        value="No"
                        checked={formData.hasHostedBefore === 'No'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span style={{ fontFamily: 'brother-1816, sans-serif' }}>No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasHostedBefore"
                        value="Unsure"
                        checked={formData.hasHostedBefore === 'Unsure'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span style={{ fontFamily: 'brother-1816, sans-serif' }}>Unsure</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[#0088ff] text-sm mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                    Preferred book fair season
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredSeason"
                        value="Spring 2026"
                        checked={formData.preferredSeason === 'Spring 2026'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span className="text-sm" style={{ fontFamily: 'brother-1816, sans-serif' }}>Spring 2026</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredSeason"
                        value="Summer 2026"
                        checked={formData.preferredSeason === 'Summer 2026'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span className="text-sm" style={{ fontFamily: 'brother-1816, sans-serif' }}>Summer 2026</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preferredSeason"
                        value="Fall 2026"
                        checked={formData.preferredSeason === 'Fall 2026'}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[#0088ff]"
                      />
                      <span className="text-sm" style={{ fontFamily: 'brother-1816, sans-serif' }}>Fall 2026</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Organization Name */}
              <input
                type="text"
                name="orgName"
                placeholder="Name of Organization *"
                value={formData.orgName}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              />

              {/* Address */}
              <input
                type="text"
                name="address1"
                placeholder="Address 1 *"
                value={formData.address1}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              />

              <input
                type="text"
                name="address2"
                placeholder="Address 2"
                value={formData.address2}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              />

              {/* City, State, Zip */}
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <input
                  type="text"
                  name="city"
                  placeholder="City *"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                />
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-2 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  <option value="">State *</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                <input
                  type="text"
                  name="zip"
                  placeholder="Zip *"
                  value={formData.zip}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                />
              </div>

              {/* Website */}
              <input
                type="text"
                name="website"
                placeholder="Website *"
                value={formData.website}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              />

              {/* Organization Type */}
              <div className="mb-2.5">
                <label className="block text-[#0088ff] text-sm mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>What type of organization are you? *</label>
                <select
                  name="orgType"
                  value={formData.orgType}
                  onChange={handleChange}
                  required
                  className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  <option value="">Select one...</option>
                  <option value="School">School</option>
                  <option value="Parish">Parish</option>
                  <option value="Diocese">Diocese</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* School specific fields */}
              {formData.orgType === 'School' && (
                <div className="mb-4 space-y-2.5">
                  <h3
                    className="text-[#0088ff] text-xl font-bold text-center mb-4"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    ABOUT YOUR SCHOOL
                  </h3>

                  {/* School type and Grade levels - side by side */}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="schoolType"
                      value={formData.schoolType}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">School Type *</option>
                      <option value="Private">Private</option>
                      <option value="Public">Public</option>
                      <option value="Home school">Home school</option>
                    </select>
                    <select
                      name="gradeLevels"
                      value={formData.gradeLevels}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Grade Levels *</option>
                      <option value="3PK-8">3PK-8</option>
                      <option value="PK-5">PK-5</option>
                      <option value="K-12">K-12</option>
                      <option value="9-12">9-12</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Affiliation - conditional based on school type */}
                  {formData.schoolType === 'Private' && (
                    <select
                      name="affiliation"
                      value={formData.affiliation}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Affiliation *</option>
                      <option value="Catholic">Catholic</option>
                      <option value="Christian">Christian</option>
                      <option value="Independent">Independent</option>
                    </select>
                  )}

                  {formData.schoolType === 'Public' && (
                    <select
                      name="affiliation"
                      value={formData.affiliation}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Affiliation *</option>
                      <option value="Non Charter">Non Charter</option>
                      <option value="Other">Other</option>
                    </select>
                  )}

                  {formData.schoolType === 'Home school' && (
                    <select
                      name="affiliation"
                      value={formData.affiliation}
                      onChange={handleChange}
                      required
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      <option value="">Affiliation *</option>
                      <option value="Catholic">Catholic</option>
                      <option value="Christian">Christian</option>
                      <option value="Independent">Independent</option>
                    </select>
                  )}

                  {/* Number of students and Diocese - side by side for Catholic */}
                  <div className={`grid gap-2 ${formData.affiliation === 'Catholic' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <input
                      type="number"
                      name="studentsEnrolled"
                      placeholder="Number of students"
                      value={formData.studentsEnrolled}
                      onChange={handleChange}
                      className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    />
                    {formData.affiliation === 'Catholic' && (
                      <select
                        name="diocese"
                        value={formData.diocese}
                        onChange={handleChange}
                        className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                        style={{ fontFamily: 'brother-1816, sans-serif' }}
                      >
                        <option value="">Diocese...</option>
                        {DIOCESES.map(diocese => (
                          <option key={diocese} value={diocese}>{diocese}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Parish specific fields */}
              {formData.orgType === 'Parish' && (
                <div className="border-2 border-[#0088ff]/30 rounded-xl p-4 mb-4 space-y-2.5">
                  <input
                    type="number"
                    name="studentsEnrolled"
                    placeholder="Number of parishioners"
                    value={formData.studentsEnrolled}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />
                  <select
                    name="diocese"
                    value={formData.diocese}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white tracking-wide"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    <option value="">Select Diocese...</option>
                    {DIOCESES.map(diocese => (
                      <option key={diocese} value={diocese}>{diocese}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* SMS Consent */}
              <label className="flex items-start gap-3 cursor-pointer mb-4 text-sm text-gray-600" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                <input
                  type="checkbox"
                  name="smsConsent"
                  checked={formData.smsConsent}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5 rounded border-2 border-[#0088ff] accent-[#0088ff] cursor-pointer flex-shrink-0"
                />
                <span>I consent for Ignatius Book Fairs to communicate important messages via text.</span>
              </label>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-300 text-gray-700 font-bold uppercase px-6 py-4 rounded-xl hover:bg-gray-400 transition-colors tracking-wider"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  &lt; BACK
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#50db92] text-white font-bold uppercase px-6 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider disabled:opacity-50"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  {isSubmitting ? 'SUBMITTING...' : 'SUBMIT >'}
                </button>
              </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpForm;
