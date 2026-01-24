'use client';

import { useState, useEffect, useCallback } from 'react';

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

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howDidYouHear: '',
    previouslyHadFair: false,
    comments: '',
    rebookEmail: '',
    rebookPhone: '',
    rebookWebsite: '',
  });

  const [hubspotData, setHubspotData] = useState<HubSpotData | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Lookup HubSpot data when email or website changes
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
        console.log('HubSpot response:', data);
        setHubspotData(data);
      }
    } catch (error) {
      console.error('HubSpot lookup error:', error);
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Debounce the lookup
  useEffect(() => {
    if (!formData.previouslyHadFair) return;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with HubSpot or backend
    console.log('Form submitted:', formData);
    alert('Thank you! Your submission has been received!');
  };

  return (
    <section id="signup" className="relative py-16 md:py-24 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/header-blob2.png')" }}
    >
      <div className="max-w-[850px] mx-auto px-4">
        {/* White Semi-transparent Form Card */}
        <div className="bg-white/90 rounded-md border border-[#0087ff] p-10 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 
              className="text-[#0088ff] mb-[20px] text-[35px]"
              style={{ fontFamily: "brother-1816, sans-serif", lineHeight: '90%' }}
            >
              Inquire about an<br />Ignatius Book Fair
            </h1>
            <p 
              className="text-gray-700 text-sm md:text-base max-w-[77%] mx-auto"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Interested in hosting a book fair? Fill out this form and one of our Book Fair Pros will be in touch with all the details you need!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className={`mb-4 p-4 border-4 border-[#0088ff] rounded-xl bg-gray-100 transition-all ${formData.previouslyHadFair ? 'pb-6' : ''}`}>
              <label className="flex items-center justify-center gap-3 cursor-pointer" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                <input
                  type="checkbox"
                  name="previouslyHadFair"
                  checked={formData.previouslyHadFair}
                  onChange={handleChange}
                  className="w-6 h-6 rounded border-2 border-[#0088ff] accent-[#0088ff] cursor-pointer"
                />
                <span className="text-[#0088ff] text-lg font-semibold">Have you previously had an Ignatius Book Fair?</span>
              </label>

              <div className={`grid transition-all duration-300 ease-out ${formData.previouslyHadFair ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                <div className="overflow-hidden">
                <div className="space-y-3">
                  <input
                    type="email"
                    name="rebookEmail"
                    placeholder="Email"
                    value={formData.rebookEmail}
                    onChange={handleChange}
                    className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  />
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

                  {/* Loading indicator */}
                  {isLookingUp && (
                    <div className="text-center text-[#0088ff]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                      <p className="text-sm">Looking up your information...</p>
                    </div>
                  )}

                  {/* Embedded HubSpot booking calendar */}
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

                  {!hubspotData?.bookingUrl && (
                    <div className="text-center pt-2">
                      <button
                        type="submit"
                        className="bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider"
                        style={{ fontFamily: 'brother-1816, sans-serif' }}
                      >
                        REBOOK A FAIR &gt;
                      </button>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>

            {!formData.previouslyHadFair && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2.5">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
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
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            />
            
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full h-11 px-4 rounded-lg border-0 bg-[#0088ff] text-white placeholder-white tracking-wide mb-2.5"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            />
            
            <div className="mb-2.5">
              <label className="block text-[#0088ff] text-sm mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>How did you hear about us?</label>
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
                className="bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider w-auto whitespace-nowrap"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                ABOUT YOUR ORGANIZATION &gt;
              </button>
            </div>
            </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignUpForm;
