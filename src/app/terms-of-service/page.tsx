import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Ignatius Book Fairs',
  description: 'Terms of service and conditions for using Ignatius Book Fairs services.',
};

export default function TermsOfServicePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--accent)] to-[var(--primary-dark)] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms of Service</h1>
          <p className="text-xl text-gray-200">
            Last updated: January 2024
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg">
          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mb-8">
            By accessing and using the Ignatius Book Fairs website and services, you accept and agree 
            to be bound by the terms and provisions of this agreement. If you do not agree to abide 
            by these terms, please do not use this website or our services.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">2. Description of Services</h2>
          <p className="text-gray-600 mb-8">
            Ignatius Book Fairs, a partnership between Ave Maria University and Ignatius Press, 
            provides book fair services to schools, parishes, and other organizations. Our services 
            include supplying quality literature, managing book fair logistics, and providing 
            support for successful events.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">3. User Responsibilities</h2>
          <p className="text-gray-600 mb-4">
            When hosting an Ignatius Book Fair, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-8 space-y-2">
            <li>Handle all book fair materials with reasonable care</li>
            <li>Return unsold books and materials in their original condition</li>
            <li>Process payments according to agreed-upon procedures</li>
            <li>Provide accurate information when registering for a book fair</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">4. Book Returns and Exchanges</h2>
          <p className="text-gray-600 mb-8">
            All unsold books must be returned within the specified timeframe after your book fair 
            concludes. Books should be returned in their original condition using the prepaid 
            shipping materials provided. Damaged or missing books may be charged to the hosting 
            organization.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">5. Payment Terms</h2>
          <p className="text-gray-600 mb-8">
            Payment for sold books is due within 30 days of the book fair&apos;s conclusion. 
            Accepted payment methods will be communicated during the book fair planning process. 
            Organizations are responsible for collecting payments from customers during the fair.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">6. Ave Dollars Rewards</h2>
          <p className="text-gray-600 mb-8">
            Organizations earn Ave Dollars based on book fair sales. These rewards can be redeemed 
            for books from our catalog. Ave Dollars have no cash value and expire 12 months from 
            the date earned unless otherwise specified.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">7. Intellectual Property</h2>
          <p className="text-gray-600 mb-8">
            All content on this website, including text, graphics, logos, and images, is the 
            property of Ignatius Book Fairs, Ave Maria University, or Ignatius Press and is 
            protected by copyright laws. You may not reproduce, distribute, or create derivative 
            works without express written permission.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-600 mb-8">
            Ignatius Book Fairs shall not be liable for any indirect, incidental, special, or 
            consequential damages resulting from the use or inability to use our services. Our 
            total liability shall not exceed the amount paid for services in the twelve months 
            preceding any claim.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">9. Cancellation Policy</h2>
          <p className="text-gray-600 mb-8">
            If you need to cancel or reschedule your book fair, please contact us as soon as 
            possible. Cancellations made less than two weeks before the scheduled fair may incur 
            shipping charges for materials already sent.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">10. Changes to Terms</h2>
          <p className="text-gray-600 mb-8">
            We reserve the right to modify these terms at any time. Changes will be effective 
            immediately upon posting to this website. Your continued use of our services after 
            changes constitutes acceptance of the modified terms.
          </p>

          <h2 className="text-2xl font-bold text-[var(--accent)] mb-4">11. Contact Information</h2>
          <p className="text-gray-600 mb-8">
            If you have questions about these Terms of Service, please contact us at:
          </p>
          <div className="bg-[var(--light-bg)] rounded-xl p-6 mb-8">
            <p className="text-gray-700">
              <strong>Ignatius Book Fairs</strong><br />
              Email: info@ignatiusbookfairs.com<br />
              Phone: 888-771-2321
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
