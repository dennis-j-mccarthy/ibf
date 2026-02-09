'use client';

import { useVersion } from '@/contexts/VersionContext';

export default function FloatingVersionToggle() {
  const { isCatholic, setVersion } = useVersion();

  return (
    <div
      className="fixed right-0 top-1/2 z-[9999] flex flex-col shadow-xl rounded-l-xl overflow-hidden border-l-2 border-y-2 border-gray-200"
      style={{ fontFamily: 'brother-1816, sans-serif', transform: 'translateY(-50%)' }}
    >
      <button
        onClick={() => setVersion('Catholic')}
        className={`px-4 py-5 text-sm font-bold uppercase tracking-wider transition-all ${
          isCatholic
            ? 'bg-[#0088ff] text-white'
            : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        Catholic
      </button>
      <button
        onClick={() => setVersion('Public')}
        className={`px-4 py-5 text-sm font-bold uppercase tracking-wider transition-all border-t border-gray-200 ${
          !isCatholic
            ? 'bg-[#ff6445] text-white'
            : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        Public
      </button>
    </div>
  );
}
