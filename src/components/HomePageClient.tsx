'use client';

import { useState, useEffect } from 'react';
import { useVersion } from '@/contexts/VersionContext';
import ModeChooserModal from './ModeChooserModal';
import ScrollReveal from './ScrollReveal';
import SignUpForm from './SignUpForm';
import HomeHero from './HomeHero';
import HowItWorks from './HowItWorks';
import WhyHost from './WhyHost';
import DiscoverVideo from './DiscoverVideo';
import Testimonials from './Testimonials';

export default function HomePageClient({ children }: { children?: React.ReactNode }) {
  const { version, setVersion } = useVersion();
  const [showChooser, setShowChooser] = useState(false);

  // Open the mode chooser:
  //  - automatically on a visitor's first homepage visit (until they've made
  //    a choice, tracked via the `modeChooserSeen` localStorage flag), unless
  //    they arrived with an explicit ?mode= param (already pre-selected);
  //  - any time via ?chooser=1 (linkable, works on previews);
  //  - any time via Option/Alt + M. e.code === 'KeyM' is layout-independent —
  //    on macOS Option+M emits the "µ" character, so we match the physical key.
  const MODE_CHOOSER_SEEN_KEY = 'modeChooserSeen';
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('chooser') === '1') {
      setShowChooser(true);
    } else if (
      !params.get('mode') &&
      !localStorage.getItem(MODE_CHOOSER_SEEN_KEY)
    ) {
      setShowChooser(true);
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.altKey && e.code === 'KeyM') {
        e.preventDefault();
        setShowChooser(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <HomeHero />
      
      <ScrollReveal>
        <SignUpForm />
      </ScrollReveal>
      
      <ScrollReveal>
        <HowItWorks />
      </ScrollReveal>
      
      <ScrollReveal>
        <WhyHost />
      </ScrollReveal>
      
      <DiscoverVideo />
      
      <ScrollReveal>
        <Testimonials />
      </ScrollReveal>
      
      {children}

      {showChooser && (
        <ModeChooserModal
          current={version}
          onChoose={(m) => {
            setVersion(m);
            localStorage.setItem(MODE_CHOOSER_SEEN_KEY, '1');
            setShowChooser(false);
          }}
          onClose={() => {
            localStorage.setItem(MODE_CHOOSER_SEEN_KEY, '1');
            setShowChooser(false);
          }}
        />
      )}
    </>
  );
}
