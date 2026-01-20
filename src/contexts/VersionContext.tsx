'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type VersionMode = 'Catholic' | 'Public';

interface VersionContextType {
  version: VersionMode;
  setVersion: (version: VersionMode) => void;
  isCatholic: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<VersionMode>('Catholic');

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleVersionMode = (e: CustomEvent<string>) => {
      console.log('Version mode changed to:', e.detail);
      setVersion(e.detail as VersionMode);
    };

    window.addEventListener('setVersionMode', handleVersionMode as EventListener);
    return () => window.removeEventListener('setVersionMode', handleVersionMode as EventListener);
  }, []);

  return (
    <VersionContext.Provider value={{
      version,
      setVersion,
      isCatholic: version === 'Catholic'
    }}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
}
