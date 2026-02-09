'use client';

import { useState, useEffect } from 'react';
import { useVersion } from '@/contexts/VersionContext';

export default function ModeIndicator() {
  const { version, setVersion } = useVersion();
  const [dismissed, setDismissed] = useState(false);

  const isCatholic = version === 'Catholic';

  // Check localStorage on mount
  useEffect(() => {
    const isDismissed = localStorage.getItem('modeIndicatorDismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleSwitch = () => {
    setVersion(isCatholic ? 'Public' : 'Catholic');
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('modeIndicatorDismissed', 'true');
  };

  if (dismissed) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg px-4 py-3 max-w-xs border border-white"
      style={{
        fontFamily: 'brother-1816, sans-serif',
        backgroundColor: isCatholic ? '#0088ff' : '#f29500',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <p className="text-white font-semibold text-sm mb-1 pr-6">
        {isCatholic
          ? "Not a Catholic School? We also serve public, Christian and Charter Schools!"
          : "Looking for Catholic content? Switch to Catholic mode for faith-based resources!"
        }
      </p>
      <button
        onClick={handleSwitch}
        className="text-white text-sm underline hover:no-underline opacity-90 hover:opacity-100 transition-opacity font-medium"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Switch to {isCatholic ? 'Public' : 'Catholic'} Mode
      </button>
    </div>
  );
}
