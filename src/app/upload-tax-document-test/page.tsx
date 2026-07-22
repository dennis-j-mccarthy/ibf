'use client';

import { useRef, useState } from 'react';

export default function UploadTaxDocumentPage() {
  const [website, setWebsite] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!website.trim()) {
      setError('Please enter your school or organization website.');
      return;
    }
    if (!file) {
      setError('Please choose a document to upload.');
      return;
    }

    setStatus('submitting');
    try {
      const formData = new FormData();
      formData.append('website', website.trim());
      formData.append('file', file);

      const res = await fetch('/api/hubspot/upload-tax-document', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStatus('idle');
        return;
      }

      setCompanyName(data.companyName || '');
      setStatus('success');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--accent)] to-[var(--primary-dark)] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">UPLOAD TAX DOCUMENT</h1>
          <p className="text-xl text-gray-200">
            Please upload your tax-exempt certificate so we can keep it on file.<br /><br />This will help streamline your future transactions with us. Thank you!
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#00c853] flex items-center justify-center">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#02176f] mb-3">Document received!</h2>
              <p className="text-gray-600">
                Your tax-exempt certificate has been attached to{companyName ? ` the record for ${companyName}` : ' your school’s record'}. Thank you!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="website" className="block font-semibold text-[#02176f] mb-2">
                  School or Organization Website
                </label>
                <input
                  id="website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. stmaryschool.org"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[var(--accent)] focus:outline-none transition-colors"
                  disabled={status === 'submitting'}
                />
                <p className="text-sm text-gray-500 mt-2">
                  We use this to match your upload to your school&apos;s record.
                </p>
              </div>

              <div>
                <label htmlFor="file" className="block font-semibold text-[#02176f] mb-2">
                  Tax-Exempt Certificate
                </label>
                <div
                  onClick={() => status !== 'submitting' && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (status === 'submitting') return;
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  className={`w-full min-h-[220px] rounded-2xl border-[3px] border-dashed flex flex-col items-center justify-center gap-3 px-6 py-10 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-[var(--accent)] bg-blue-50'
                      : file
                        ? 'border-[#00c853] bg-green-50/50'
                        : 'border-gray-300 bg-gray-50 hover:border-[var(--accent)] hover:bg-blue-50/40'
                  }`}
                >
                  <input
                    id="file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    disabled={status === 'submitting'}
                  />
                  {file ? (
                    <>
                      <svg className="w-12 h-12 text-[#00c853]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-semibold text-[#02176f] break-all">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB — click or drop to replace</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="font-semibold text-[#02176f] text-lg">Drag &amp; drop your document here</p>
                      <p className="text-sm text-gray-500">or click to browse</p>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">PDF, image, or Word document. 10 MB max.</p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-[#00c853] hover:bg-[#00a843] disabled:opacity-60 text-white font-bold py-3.5 rounded-full transition-colors text-lg"
              >
                {status === 'submitting' ? 'Uploading…' : 'Upload Document'}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
