'use client';

import { useVersion } from '@/contexts/VersionContext';

export default function ModeIndicator() {
  const { version, setVersion } = useVersion();
  
  const isCatholic = version === 'Catholic';
  
  const handleSwitch = () => {
    setVersion(isCatholic ? 'Public' : 'Catholic');
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg px-4 py-3 max-w-xs border border-white"
      style={{ 
        fontFamily: 'brother-1816, sans-serif',
        backgroundColor: isCatholic ? '#0088ff' : '#f29500',
      }}
    >
      <p className="text-white font-semibold text-sm mb-1">
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
