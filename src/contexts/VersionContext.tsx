'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type VersionMode = 'Catholic' | 'Public';

interface VersionContextType {
  version: VersionMode;
  setVersion: (version: VersionMode) => void;
  isCatholic: boolean;
  isPublic: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

const STORAGE_KEY = 'visibility';

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<VersionMode>('Catholic');
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from URL params or localStorage on mount
  useEffect(() => {
    // 1. Check URL param first (?mode=p sets public, else catholic)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');

    let initialMode: VersionMode = 'Catholic';

    if (urlMode === 'p' || urlMode === 'public') {
      initialMode = 'Public';
    } else if (urlMode === 'c' || urlMode === 'catholic') {
      initialMode = 'Catholic';
    } else {
      // 2. Fall back to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'public') {
        initialMode = 'Public';
      } else if (stored === 'catholic') {
        initialMode = 'Catholic';
      }
    }

    setVersionState(initialMode);
    localStorage.setItem(STORAGE_KEY, initialMode.toLowerCase());
    setIsHydrated(true);
  }, []);

  // Wrapper to also persist to localStorage
  const setVersion = (newVersion: VersionMode) => {
    setVersionState(newVersion);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newVersion.toLowerCase());
    }
  };

  // Listen for keyboard shortcut events (from KeyboardShortcuts component)
  useEffect(() => {
    const handleVersionMode = (e: CustomEvent<string>) => {
      setVersion(e.detail as VersionMode);
    };

    window.addEventListener('setVersionMode', handleVersionMode as EventListener);
    return () => window.removeEventListener('setVersionMode', handleVersionMode as EventListener);
  }, []);

  // Keyboard shortcuts: plain 'c' and 'p' keys (like Webflow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+Shift+R → navigate to /bookfair-resources
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyR') {
        e.preventDefault();
        window.location.href = '/bookfair-resources';
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        setVersion('Catholic');
      } else if (e.key === 'p' || e.key === 'P') {
        setVersion('Public');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <VersionContext.Provider value={{
      version,
      setVersion,
      isCatholic: version === 'Catholic',
      isPublic: version === 'Public'
    }}>
      {isHydrated ? children : null}
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
