export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-8 text-[#0033AD]">Privacy Policy</h1>
          
          <div className="bg-blue-50 border-l-4 border-[#0033AD] p-4 mb-8">
            <p className="text-gray-800 font-semibold">
              Last updated: January 2025
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Introduction</h2>
            <p className="mb-4 text-gray-700 leading-relaxed">
              notamperdata (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our Google Forms add-on and verification service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Information We Collect</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">From the Add-on:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong className="text-gray-900">Cryptographic Hashes Only</strong>: We receive SHA-256 hashes of form responses, not the actual response data</li>
                <li><strong className="text-gray-900">Form Metadata</strong>: Form ID, Response ID, and timestamp</li>
                <li><strong className="text-gray-900">No Personal Data</strong>: The actual form responses never leave Google&apos;s servers</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-800">From the Website:</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Basic analytics data (page views, general location)</li>
                <li>Information you provide when contacting support</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">How We Use Information</h2>
            <p className="mb-4 text-gray-700">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 bg-gray-50 rounded-lg p-6">
              <li>Provide blockchain-based verification services</li>
              <li>Verify the integrity of form responses</li>
              <li>Improve our service and user experience</li>
              <li>Respond to support requests</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Data Storage and Security</h2>
            <div className="bg-green-50 rounded-lg p-6">
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Hashes are stored in our secure database</li>
                <li>We use industry-standard encryption for data in transit</li>
                <li>We cannot reverse hashes to obtain original form data</li>
                <li>Data is retained indefinitely to ensure verification availability</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Google API Services</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="mb-4 text-gray-700">
                notamperdata&apos;s use and transfer of information received from Google APIs adheres to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-[#0033AD] hover:underline font-semibold">
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              <p className="mb-4 text-gray-700 font-semibold">
                The add-on accesses Google Forms data solely to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Read form structure and responses for hashing</li>
                <li>Create triggers for automatic processing</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Data Sharing</h2>
            <p className="mb-4 text-gray-700 bg-gray-50 rounded-lg p-6">
              We do not sell, trade, or otherwise transfer your information to third parties. Hashes may be stored on blockchain networks for verification purposes, but these contain no personal information.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Your Rights</h2>
            <p className="mb-4 text-gray-700">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 bg-gray-50 rounded-lg p-6">
              <li>Disable the add-on at any time</li>
              <li>Request information about stored hashes</li>
              <li>Contact us with privacy concerns</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Changes to This Policy</h2>
            <p className="text-gray-700 bg-yellow-50 rounded-lg p-6">
              We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Contact Us</h2>
            <div className="bg-gray-100 rounded-lg p-6">
              <p className="mb-4 text-gray-700">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <div className="text-gray-800">
                <p className="mb-2"><strong>Developer Email:</strong> <a href="mailto:johnndigirigi01@gmail.com" className="text-[#0033AD] hover:underline">johnndigirigi01@gmail.com</a></p>
                <p><strong>Website:</strong> <a href="https://notamperdata.vercel.app/support" className="text-[#0033AD] hover:underline">https://notamperdata.vercel.app/support</a></p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}