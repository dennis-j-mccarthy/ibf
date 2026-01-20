'use client';

import { useEffect } from 'react';

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Option/Alt key + C or P
      if (e.altKey) {
        console.log('Alt key pressed with:', e.key);
        if (e.key === 'c' || e.key === 'C' || e.key === 'ç') {
          e.preventDefault();
          console.log('Switching to Catholic mode');
          // Dispatch custom event for Catholic mode
          window.dispatchEvent(new CustomEvent('setVersionMode', { detail: 'Catholic' }));
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'π') {
          e.preventDefault();
          console.log('Switching to Public mode');
          // Dispatch custom event for Public mode
          window.dispatchEvent(new CustomEvent('setVersionMode', { detail: 'Public' }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
