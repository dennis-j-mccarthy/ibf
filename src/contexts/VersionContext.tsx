'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type VersionMode = 'Catholic' | 'Public';

interface VersionContextType {
  version: VersionMode;
  setVersion: (version: VersionMode) => void;
  isCatholic: boolean;
  isPublic: boolean;
  taggingMode: boolean;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

const STORAGE_KEY = 'visibility';

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersionState] = useState<VersionMode>('Catholic');
  const [isHydrated, setIsHydrated] = useState(false);
  const [taggingMode, setTaggingMode] = useState(false);
  const [showTagAuth, setShowTagAuth] = useState(false);

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

      // Ctrl+Shift+T or Cmd+Shift+T → toggle tagging mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyT') {
        e.preventDefault();
        if (taggingMode) {
          setTaggingMode(false);
        } else {
          const auth = sessionStorage.getItem('faqEditAuth');
          if (auth === 'true') {
            setTaggingMode(true);
          } else {
            setShowTagAuth(true);
          }
        }
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
  }, [taggingMode]);

  const handleTagAuth = (username: string, password: string) => {
    if (username === 'ibfadmin' && password === 'ibf') {
      sessionStorage.setItem('faqEditAuth', 'true');
      setShowTagAuth(false);
      setTaggingMode(true);
    }
  };

  return (
    <VersionContext.Provider value={{
      version,
      setVersion,
      isCatholic: version === 'Catholic',
      isPublic: version === 'Public',
      taggingMode,
    }}>
      {isHydrated ? children : null}
      {taggingMode && (
        <div className="fixed bottom-4 left-4 z-[90] bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Tag Mode
          <span className="text-white/60 font-normal text-xs ml-1">⌘+Shift+T to exit</span>
        </div>
      )}
      {showTagAuth && <TagAuthModal onLogin={handleTagAuth} onClose={() => setShowTagAuth(false)} />}
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

function TagAuthModal({ onLogin, onClose }: { onLogin: (u: string, p: string) => void; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (username === 'ibfadmin' && password === 'ibf') {
      onLogin(username, password);
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-800 mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          Enter Tag Mode
        </h3>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-2 border rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {error && <p className="text-red-500 text-sm mb-3">Invalid credentials</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSubmit} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">Enter</button>
        </div>
      </div>
    </div>
  );
}
