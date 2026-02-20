'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

const STORAGE_KEY = 'ibf-guide-progress';

interface StepData {
  number: string;
  title: string;
  id: string;
}

const steps: StepData[] = [
  { number: '1', title: 'Choose Your Book Fair Partner', id: 'step-1' },
  { number: '2', title: 'Design Your Book Fair Experience', id: 'step-2' },
  { number: '3', title: 'Recruit Your Volunteers', id: 'step-3' },
  { number: '4', title: 'Set Up Your Space', id: 'step-4' },
  { number: '5', title: 'Get On the Calendar', id: 'step-5' },
  { number: '6', title: 'Spread the Word', id: 'step-6' },
  { number: '7', title: 'Join Our Live Workshop', id: 'step-7' },
  { number: '8', title: 'Decorate Your Fair', id: 'step-8' },
  { number: '9', title: 'Get Ready for Delivery', id: 'step-9' },
  { number: '✓', title: 'Have a Wonderful Book Fair!', id: 'final' },
];

export default function InPersonGuide() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedTimeline, setExpandedTimeline] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompletedSteps(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleStep = useCallback((id: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const progress = Math.round((completedSteps.size / steps.length) * 100);

  const scrollToStep = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative bg-[#0066ff] pt-16 pb-24 overflow-hidden print:bg-white print:pt-4 print:pb-4">
        <div className="absolute inset-0 z-0 print:hidden">
          <Image src="/images/Blog-Site.png" alt="" fill className="object-cover opacity-20" priority />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Link href="/bookfair-resources" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors print:hidden">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Resources
            </Link>
            <p className="text-[#ffd41d] font-brother font-bold text-sm uppercase tracking-widest mb-3 print:text-[#ff6445]">Your Step-by-Step Guide</p>
            <h1 className="font-brother font-black text-white leading-tight mb-6 print:text-[#02176f]" style={{ fontSize: 'clamp(36px, 6vw, 60px)' }}>
              <span className="text-[#ff6445] print:text-[#ff6445]">IN-PERSON</span>{' '}
              <span className="text-[#00c853] print:text-[#00c853]">BOOK FAIR</span>
            </h1>
            <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto print:text-gray-600">
              We love helping schools bring our book fair to their communities. As a book fair administrator, you will be putting quality books and merchandise into the hands of the kids in your community — and strengthening their faith at the same time.
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-10 print:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm font-brother">Your Progress</span>
              <span className="text-white font-brother font-bold text-sm">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#00c853] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Step nav pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 print:hidden">
            {steps.map(step => (
              <button
                key={step.id}
                onClick={() => scrollToStep(step.id)}
                className={`w-10 h-10 rounded-full font-brother font-bold text-sm transition-all border-2 ${
                  completedSteps.has(step.id)
                    ? 'bg-[#00c853] border-[#00c853] text-white'
                    : 'bg-transparent border-white/40 text-white hover:border-white hover:bg-white/10'
                }`}
              >
                {step.number}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Guide Content */}
      <section className="bg-[#f5f5eb] py-12 print:py-2 print:bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-8 print:space-y-4">

            {/* Loupio intro */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 print:shadow-none print:border-0 print:p-4">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-[#ffd41d] flex items-center justify-center text-3xl print:hidden">
                  📖
                </div>
                <div>
                  <p className="text-gray-600 leading-relaxed italic">
                    &ldquo;My name is Loupio and I am going to be your guide to this guide. You probably recognize me from my comic book series, <strong>The Adventures of Loupio</strong>. I&apos;m going to show you what you need to do to make YOUR book fair successful. So, follow my lead and let&apos;s get started!&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            <StepCard step={steps[0]} completed={completedSteps.has('step-1')} onToggle={toggleStep}>
              <p>Choose the best company to provide everything you need to host a successful book fair — one that will support you every step of the way!</p>
              <div className="mt-4 bg-[#00c853]/10 border border-[#00c853]/30 rounded-xl p-5">
                <p className="text-[#00c853] font-brother font-bold text-sm uppercase tracking-wide mb-1">Congratulations!</p>
                <p className="text-gray-600">You&apos;ve accomplished Step One already. You have your dates set — read on to see how we can maximize your fair!</p>
              </div>
            </StepCard>

            {/* Step 2 */}
            <StepCard step={steps[1]} completed={completedSteps.has('step-2')} onToggle={toggleStep}>
              <p>As you prepare your fair, here are key practices that have worked well for us in running our own successful fairs.</p>
              <ol className="mt-4 space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0066ff] text-white font-brother font-bold text-sm flex items-center justify-center">1</span>
                  <div>
                    <p className="text-gray-700"><strong>Advertise early and often</strong> — before, during, and as your fair is getting ready to close. Share a flyer the week before your fair opens.</p>
                    <ResourceLink href="/bookfair-resources?resource=fillable-backpack-flyer-1" label="Edit the backpack flyer with your schedule" />
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0066ff] text-white font-brother font-bold text-sm flex items-center justify-center">2</span>
                  <div>
                    <p className="text-gray-700"><strong>Keep your fair open evenings and/or weekends.</strong> Consider hosting an evening event for your community to shop and enjoy a snack, a beverage and socialize, as they stroll the selections.</p>
                    <p className="text-gray-500 text-sm mt-2">Consider extending your reach to families who attend different parishes, non-religious schools, or are homeschooled. Be creative with your events!</p>
                  </div>
                </li>
              </ol>
            </StepCard>

            {/* Step 3 */}
            <StepCard step={steps[2]} completed={completedSteps.has('step-3')} onToggle={toggleStep}>
              <p>Free services like <a href="https://www.signupgenius.com" target="_blank" rel="noopener noreferrer" className="text-[#0066ff] font-semibold hover:underline">Sign-Up Genius</a> work well. Ignatius Book Fairs will send nearly everything you need, except volunteers!</p>
              <h4 className="font-brother font-bold text-[#02176f] mt-5 mb-3">Volunteers can help you:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  'Develop fun ideas to promote the fair',
                  'Empty boxes and set up the fair',
                  'Scan in boxes before the fair begins',
                  'Bring in music to keep the space lively',
                  'Clear and decorate the space',
                  'Work the floor, suggesting books',
                  'Organize refreshments and treats',
                  'Run a craft table for children',
                  'Promote the fair on social media',
                  'Run the check-out station',
                  'Pack up and clean up',
                ].map(task => (
                  <div key={task} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-[#00c853] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {task}
                  </div>
                ))}
              </div>
            </StepCard>

            {/* Step 4 */}
            <StepCard step={steps[3]} completed={completedSteps.has('step-4')} onToggle={toggleStep}>
              <p>Arrange tables away from the walls in a space of at least <strong>800 square feet</strong>. We recommend <strong>12–16 six-foot tables</strong>.</p>
              <h4 className="font-brother font-bold text-[#02176f] mt-5 mb-3">Suggested Table Layout</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Early Reader', tables: '1 table' },
                  { label: 'Picture Books', tables: '2–3 tables' },
                  { label: 'Elementary', tables: '3 tables' },
                  { label: 'Middle School', tables: '1–3 tables' },
                  { label: 'Seasonal', tables: '1 table' },
                  { label: 'Crafts & Activities', tables: '1 table' },
                  { label: 'Comic Books', tables: '1 table' },
                  { label: 'Older Readers & Adults', tables: '1 table' },
                  { label: 'Toys & Trinkets', tables: '1 table' },
                  { label: 'Check-out Station', tables: '1–2 tables' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center bg-[#f5f5eb] rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-xs text-[#0066ff] font-brother font-bold">{item.tables}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-[#ffd41d]/15 border border-[#ffd41d]/40 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <strong>Tip:</strong> If hosting events, you may need additional tables for snacks and a space to entertain younger children — for example, a table with coloring pages and crayons.
                </p>
                <ResourceLink href="/bookfair-resources?resource=coloring-sheet-1" label="Download coloring pages" />
              </div>
            </StepCard>

            {/* Step 5 */}
            <StepCard step={steps[4]} completed={completedSteps.has('step-5')} onToggle={toggleStep}>
              <p>Make sure the book fair details (times, dates, location) are on all necessary calendars including the school and parish calendar.</p>
              <ResourceLink href="/bookfair-resources" label="Browse advertising resources" />
            </StepCard>

            {/* Step 6 */}
            <StepCard step={steps[5]} completed={completedSteps.has('step-6')} onToggle={toggleStep}>
              <p>Advertise early, before the fair, and daily during the fair. Send a <strong>Save-the-Date 4–6 weeks before</strong> and advertise weekly leading up to opening day.</p>
              <ResourceLink href="/bookfair-resources?resource=social-media-guide" label="Social Media Guide" />

              <h4 className="font-brother font-bold text-[#02176f] mt-6 mb-3">Where to Advertise</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Parish bulletin',
                  'Parish calendar',
                  'Parish email list',
                  'Pulpit announcement',
                  'Local parishes in diocese',
                  'School newsletter',
                  'School & parish websites',
                  'Social media channels',
                  'Library flyers',
                  'Homeschool co-ops',
                  'Neighborhood paper',
                  'Area schools',
                ].map(place => (
                  <div key={place} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-3.5 h-3.5 text-[#ff6445] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" /></svg>
                    {place}
                  </div>
                ))}
              </div>

              {/* Social Media Timeline */}
              <div className="mt-6">
                <button
                  onClick={() => setExpandedTimeline(!expandedTimeline)}
                  className="w-full flex items-center justify-between bg-[#0066ff] hover:bg-[#0052cc] text-white rounded-xl px-6 py-4 transition-colors print:bg-[#0066ff]"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="font-brother font-bold text-sm uppercase tracking-wide">Social Media Schedule</span>
                  </div>
                  <svg className={`w-5 h-5 transition-transform print:hidden ${expandedTimeline ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                <div className={`overflow-hidden transition-all duration-500 ${expandedTimeline ? 'max-h-[5000px] mt-4' : 'max-h-0 print:max-h-[5000px] print:mt-4'}`}>
                  <div className="relative pl-8 space-y-0">
                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#0066ff]/20 print:bg-[#0066ff]/30" />

                    <TimelineItem week="6 weeks before" color="#ff6445">
                      <p>Post <strong>SAVE THE DATE</strong> on all social media, parish bulletin, and weekly newsletter.</p>
                      <SampleWording>We are excited to announce that we are hosting an Ignatius Book Fair on [dates]. Ignatius Book Fairs offers a variety of beautiful, fun, engaging books and activities. Supporting the book fair with a purchase will help us purchase new books for our library and classrooms. Please mark the dates down!</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="5 weeks before" color="#00c853">
                      <p>Share the <strong>&ldquo;What Makes an Ignatius Book Fair Special&rdquo;</strong> video on social media.</p>
                      <ResourceLink href="/bookfair-resources?resource=what-makes-an-ignatius-book-fair-special" label="Watch the video" />
                      <SampleWording>Our book fair is in 5 weeks! We are excited to be partnering with Ignatius Book Fairs! Click here to create an account and link to our school so that your school receives benefits from your purchases.</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="4 weeks before" color="#0066ff">
                      <p>Post another <strong>save the date</strong> reminder to your community.</p>
                    </TimelineItem>

                    <TimelineItem week="3 weeks before" color="#ffd41d">
                      <p>Select a few titles from the website that your staff or teachers are reading and share them with your community.</p>
                    </TimelineItem>

                    <TimelineItem week="2 weeks before" color="#ff6445">
                      <p>Have the <strong>principal send an invitation</strong> to the community about shopping opportunities.</p>
                      <ResourceLink href="/bookfair-resources?resource=principal-parent-letter-in-person" label="Principal letter template" />
                    </TimelineItem>

                    <TimelineItem week="1 week before" color="#00c853">
                      <p>Put out <strong>Sneak Peek flyers</strong> in common areas and your school newsletter.</p>
                      <ResourceLink href="/bookfair-resources?resource=bookfair-sneak-peek" label="Bookfair Sneak Peek" />
                    </TimelineItem>

                    <TimelineItem week="Evening before" color="#0066ff">
                      <p>Final social media push — post the <strong>&ldquo;Tomorrow is the day!&rdquo;</strong> graphic.</p>
                    </TimelineItem>

                    <TimelineItem week="Day 1" color="#ff6445" bold>
                      <p>Kick off by introducing the <strong>Reading Challenge</strong> to families!</p>
                      <ResourceLink href="/bookfair-resources?resource=reading-challenge-campaign" label="Reading Challenge materials" />
                    </TimelineItem>

                    <TimelineItem week="Day 2" color="#00c853" bold>
                      <SampleWording>We are on day 2 of our book fair. Shopping is available in-person at [TIMES], at [LOCATION]. All purchases help us with our goal of getting new books for our classrooms and library.</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="Day 3" color="#0066ff" bold>
                      <SampleWording>Have you checked out our book fair? Reading recommendations by age and grade level are available both on-site and online.</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="Day 4" color="#ffd41d" bold>
                      <SampleWording>We took a peek at the numbers and these five titles have been the most popular with our community so far. [List your top sellers]</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="Day 5" color="#ff6445" bold>
                      <SampleWording>An easy way to foster a love of reading is to model it in your home. Consider setting aside 20 minutes as a &ldquo;Stop, Drop and Read&rdquo; habit each day.</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="Day 6" color="#00c853" bold>
                      <SampleWording>Tomorrow is the last day of our book fair! We want to thank everyone who stopped by. If you have book recommendations for other parents, please share them below.</SampleWording>
                    </TimelineItem>

                    <TimelineItem week="Day 7 — Last Day!" color="#0066ff" bold>
                      <SampleWording>Today is the last day for the book fair. Your purchases earn us a percentage back to spend on free books for our school. We appreciate you!</SampleWording>
                    </TimelineItem>
                  </div>
                </div>
              </div>
            </StepCard>

            {/* Step 7 */}
            <StepCard step={steps[6]} completed={completedSteps.has('step-7')} onToggle={toggleStep}>
              <p>Watch for email invitations to our <strong>3-part live workshop series</strong> featuring task-specific topics to keep you on pace as you plan your fair.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { part: 'Part 1', timing: '~90 days out', color: '#ff6445' },
                  { part: 'Part 2', timing: '~60 days out', color: '#00c853' },
                  { part: 'Part 3', timing: 'Month of fair', color: '#0066ff' },
                ].map(w => (
                  <div key={w.part} className="text-center rounded-xl p-4 border-2" style={{ borderColor: w.color }}>
                    <p className="font-brother font-bold text-sm" style={{ color: w.color }}>{w.part}</p>
                    <p className="text-gray-500 text-xs mt-1">{w.timing}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">Even if you cannot join live, please RSVP yes so you can receive the recordings.</p>
            </StepCard>

            {/* Step 8 */}
            <StepCard step={steps[7]} completed={completedSteps.has('step-8')} onToggle={toggleStep}>
              <p>It&apos;s important that your fair looks <strong>beautiful, fun, and inviting</strong>. One week before your fair begins, we will deliver:</p>
              <div className="mt-4 space-y-2">
                {[
                  'All the books and items for sale plus 2 payment devices',
                  'Table category signs in clear acrylic frames',
                  '50 book stands',
                  'Rectangular tablecloths in mint, yellow, and orange',
                  '5 decorative posters',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3 bg-[#f5f5eb] rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-[#0066ff] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <span className="text-gray-700 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">The rest is up to you! Think of seasonal themes, book themes, art from your younger students — anything to make it uniquely yours.</p>
            </StepCard>

            {/* Step 9 */}
            <StepCard step={steps[8]} completed={completedSteps.has('step-9')} onToggle={toggleStep}>
              <p>One week before your book fair begins, Ignatius Book Fairs will deliver your books and other materials. Depending on the size of your organization, you will receive <strong>20–38 boxes</strong>.</p>

              <h4 className="font-brother font-bold text-[#02176f] mt-5 mb-3">Setup Order</h4>
              <div className="space-y-3">
                {[
                  { num: '1st', text: 'Find the box marked "Open First" — plug in payment devices to charge fully.' },
                  { num: '2nd', text: 'Find the marketing box. Set up tables, tablecloths, category signs, and 2–3 book stands per table.' },
                  { num: '3rd', text: 'Log in to the payment device using your unique code and scan in the boxes.' },
                  { num: '4th', text: 'Sort your boxes and place them in front of the matching category tables.' },
                  { num: '5th', text: 'Unbox the books and arrange them on the tables. Have fun with this!' },
                ].map(item => (
                  <div key={item.num} className="flex items-start gap-3">
                    <span className="flex-shrink-0 bg-[#ff6445] text-white font-brother font-bold text-xs px-2.5 py-1 rounded-full">{item.num}</span>
                    <p className="text-gray-700 text-sm">{item.text}</p>
                  </div>
                ))}
              </div>

              <ResourceLink href="/bookfair-resources?resource=pos-device-instructions" label="POS Device Instructions" />

              <div className="mt-6 bg-[#ffd41d]/15 border border-[#ffd41d]/40 rounded-xl p-4">
                <p className="font-brother font-bold text-sm text-[#02176f] mb-2">Things you may need to supply:</p>
                <p className="text-sm text-gray-600">Bags for purchases, a cashbox for cash sales, a sharpie marker, packing tape.</p>
              </div>

              <div className="mt-4 bg-[#ff6445]/10 border border-[#ff6445]/30 rounded-xl p-4">
                <p className="font-brother font-bold text-sm text-[#ff6445] mb-1">Key Reminder</p>
                <p className="text-sm text-gray-600">Advertising early and often is essential and is the #1 way to earn more rewards for your school!</p>
              </div>

              <h4 className="font-brother font-bold text-[#02176f] mt-6 mb-3">Final Week Checklist</h4>
              <div className="space-y-2">
                {[
                  { id: 'checklist-14day', label: 'Within 14 days: Email a letter home to families with dates/times/purpose' },
                  { id: 'checklist-7day', label: 'Within 7 days: Email a link to the general flyer and sneak peek flyer' },
                  { id: 'checklist-schedule', label: 'Ensure your schedule allows ample time for community to browse' },
                  { id: 'checklist-social', label: 'Share on your social media channels' },
                ].map(item => (
                  <ChecklistItem key={item.id} id={item.id} label={item.label} />
                ))}
              </div>
            </StepCard>

            {/* Final Step */}
            <StepCard step={steps[9]} completed={completedSteps.has('final')} onToggle={toggleStep} isFinal>
              <p>Please reach out to your Book Fair Manager should any issue arise. We are here to cheer you on and give you advice and support along the way!</p>
              <div className="mt-6 text-center">
                <a
                  href="mailto:bookfairpro@ignatiusbookclub.com"
                  className="inline-flex items-center gap-2 bg-[#0066ff] hover:bg-[#0052cc] text-white font-brother font-bold px-8 py-3 rounded-full transition-colors print:border print:border-[#0066ff] print:bg-white print:text-[#0066ff]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Contact Your Book Fair Manager
                </a>
              </div>
            </StepCard>

            {/* Print / Download buttons */}
            <div className="flex justify-center gap-4 pt-4 print:hidden">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 bg-[#02176f] hover:bg-[#01104f] text-white font-brother font-bold px-6 py-3 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print This Guide
              </button>
              <a
                href="/documents/6972c6f5a779558d8d96668a_in-person-guide-catholic-1-22-26.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#00c853] hover:bg-[#00a843] text-white font-brother font-bold px-6 py-3 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download PDF
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, footer, .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          section { break-inside: avoid; }
          .step-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </>
  );
}

function StepCard({ step, completed, onToggle, children, isFinal }: {
  step: StepData;
  completed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  isFinal?: boolean;
}) {
  return (
    <div id={step.id} className="step-card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border print:border-gray-200 print:rounded-lg">
      {/* Header */}
      <div className={`flex items-center gap-4 px-8 py-5 ${isFinal ? 'bg-[#00c853]' : 'bg-[#02176f]'}`}>
        <button
          onClick={() => onToggle(step.id)}
          className={`flex-shrink-0 w-10 h-10 rounded-full border-2 font-brother font-bold text-sm flex items-center justify-center transition-all print:border-white print:text-white ${
            completed
              ? 'bg-[#00c853] border-[#00c853] text-white'
              : 'bg-transparent border-white/50 text-white hover:border-white'
          }`}
        >
          {completed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          ) : (
            step.number
          )}
        </button>
        <div>
          {!isFinal && <p className="text-white/60 text-xs font-brother uppercase tracking-widest">Step {step.number}</p>}
          <h2 className="text-white font-brother font-bold text-lg leading-tight">{step.title}</h2>
        </div>
      </div>
      {/* Body */}
      <div className="px-8 py-6 text-gray-700 leading-relaxed space-y-3 print:py-4">
        {children}
      </div>
    </div>
  );
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 mt-3 text-[#ff6445] font-brother font-semibold text-sm hover:underline print:text-[#ff6445]"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      {label}
    </Link>
  );
}

function TimelineItem({ week, color, bold, children }: { week: string; color: string; bold?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative pb-6 print:pb-3">
      <div className="absolute -left-5 top-1 w-4 h-4 rounded-full border-2 bg-white" style={{ borderColor: color }} />
      <p className={`font-brother text-xs uppercase tracking-widest mb-1.5 ${bold ? 'font-black' : 'font-bold'}`} style={{ color }}>{week}</p>
      <div className="text-gray-600 text-sm space-y-2">
        {children}
      </div>
    </div>
  );
}

function SampleWording({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 bg-[#f5f5eb] rounded-lg p-3 border-l-3 border-[#ffd41d]" style={{ borderLeftWidth: '3px', borderLeftColor: '#ffd41d' }}>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-brother mb-1">Sample wording</p>
      <p className="text-sm text-gray-500 italic">{children}</p>
    </div>
  );
}

function ChecklistItem({ id, label }: { id: string; label: string }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ibf-checklist-${id}`);
      if (saved === 'true') setChecked(true);
    } catch {}
  }, [id]);

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    localStorage.setItem(`ibf-checklist-${id}`, String(next));
  };

  return (
    <button onClick={toggle} className="flex items-start gap-3 w-full text-left group">
      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-all ${
        checked ? 'bg-[#00c853] border-[#00c853]' : 'border-gray-300 group-hover:border-[#00c853]'
      }`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        )}
      </div>
      <span className={`text-sm transition-colors ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{label}</span>
    </button>
  );
}
