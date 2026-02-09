'use client';

import { useState, useEffect, useCallback } from 'react';

interface FAQ {
  id: number;
  question: string;
  version: string;
}

interface FAQTaggingModalProps {
  faq: FAQ;
  onClose: () => void;
  onUpdate: (faqId: number, newVersion: string) => void;
}

export default function FAQTaggingModal({ faq, onClose, onUpdate }: FAQTaggingModalProps) {
  const [hasCatholic, setHasCatholic] = useState(false);
  const [hasPublic, setHasPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Parse current version tags
  useEffect(() => {
    const version = faq.version || '';
    if (version === 'Both' || version === 'Catholic,Public' || version === 'Public,Catholic') {
      setHasCatholic(true);
      setHasPublic(true);
    } else {
      setHasCatholic(version.includes('Catholic'));
      setHasPublic(version.includes('Public'));
    }
  }, [faq.version]);

  const handleSave = useCallback(async () => {
    setSaving(true);

    let newVersion = '';
    if (hasCatholic && hasPublic) {
      newVersion = 'Both';
    } else if (hasCatholic) {
      newVersion = 'Catholic';
    } else if (hasPublic) {
      newVersion = 'Public';
    } else {
      newVersion = ''; // No tags - won't show in either
    }

    try {
      const response = await fetch(`/api/faqs/${faq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: newVersion }),
      });

      if (response.ok) {
        onUpdate(faq.id, newVersion);
        onClose();
      } else {
        console.error('Failed to update FAQ');
      }
    } catch (error) {
      console.error('Error updating FAQ:', error);
    } finally {
      setSaving(false);
    }
  }, [faq.id, hasCatholic, hasPublic, onClose, onUpdate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      } else if (e.key === 'c' || e.key === 'C') {
        if (!e.metaKey && !e.ctrlKey) {
          setHasCatholic((prev) => !prev);
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (!e.metaKey && !e.ctrlKey) {
          setHasPublic((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleSave]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0088ff] px-6 py-4">
          <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            Tag FAQ
          </h2>
          <p className="text-white/80 text-sm mt-1 line-clamp-2">{faq.question}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            Select which versions this FAQ should appear in:
          </p>

          <div className="space-y-3">
            {/* Catholic Toggle */}
            <button
              onClick={() => setHasCatholic(!hasCatholic)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                hasCatholic
                  ? 'border-[#0088ff] bg-[#0088ff]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    hasCatholic ? 'bg-[#0088ff]' : 'bg-gray-200'
                  }`}
                >
                  {hasCatholic && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-gray-800" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Catholic
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">Press C</span>
            </button>

            {/* Public Toggle */}
            <button
              onClick={() => setHasPublic(!hasPublic)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                hasPublic
                  ? 'border-[#ff6445] bg-[#ff6445]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    hasPublic ? 'bg-[#ff6445]' : 'bg-gray-200'
                  }`}
                >
                  {hasPublic && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-gray-800" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Public
                </span>
              </div>
              <span className="text-xs text-gray-400 font-mono">Press P</span>
            </button>
          </div>

          {/* Warning if no tags */}
          {!hasCatholic && !hasPublic && (
            <p className="mt-4 text-amber-600 text-sm bg-amber-50 px-3 py-2 rounded-lg">
              Warning: This FAQ will not appear in either version if no tags are selected.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            <span className="font-mono">Esc</span> to cancel &bull; <span className="font-mono">⌘+Enter</span> to save
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#0088ff] text-white font-bold rounded-lg hover:bg-[#0077ee] transition-colors disabled:opacity-50"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
