'use client';

import { useEffect } from 'react';

export default function UploadTaxDocumentPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//js.hsforms.net/forms/embed/v2.js';
    script.charset = 'utf-8';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      if ((window as any).hbspt) {
        (window as any).hbspt.forms.create({
          region: 'na1',
          portalId: '44239293',
          formId: '86e5f283-d17b-4855-ab8a-624139439b23',
          target: '#hubspot-tax-form',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--accent)] to-[var(--primary-dark)] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">UPLOAD TAX DOCUMENT</h1>
          <p className="text-xl text-gray-200">
            Please upload your tax-exempt certificate so we can keep it on file. This will help streamline your future transactions with us. Thank you!
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div id="hubspot-tax-form" />
        </div>
      </section>
    </>
  );
}
