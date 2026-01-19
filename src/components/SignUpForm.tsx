'use client';

import { useState } from 'react';

const SignUpForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    howDidYouHear: '',
    previouslyHadFair: false,
    comments: '',
  });

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
            <div className="mb-2.5">
              <label className="flex items-center gap-3 cursor-pointer" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                <input
                  type="checkbox"
                  name="previouslyHadFair"
                  checked={formData.previouslyHadFair}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-2 border-[#0088ff] accent-[#0088ff] cursor-pointer"
                />
                <span className="text-[#0088ff] text-sm">Have you previously had an Ignatius Book Fair?</span>
              </label>
            </div>
            
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
                className="bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider w-[65%]"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                ABOUT YOUR ORGANIZATION &gt;
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignUpForm;
