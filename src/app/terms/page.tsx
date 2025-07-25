export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-8 text-[#0033AD]">Terms of Service</h1>
          
          <div className="bg-blue-50 border-l-4 border-[#0033AD] p-4 mb-8">
            <p className="text-gray-800 font-semibold">
              Last updated: January 2025
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-6">
              By installing and using the notamperdata add-on for Google Forms (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">2. Description of Service</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="mb-4 text-gray-700">
                notamperdata provides blockchain-based verification for Google Forms responses by:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Generating cryptographic hashes of form responses</li>
                <li>Storing these hashes for future verification</li>
                <li>Providing tools to verify response integrity</li>
              </ul>
              <p className="mt-4 text-gray-700 font-semibold">
                The Service processes data within Google&apos;s infrastructure and only transmits cryptographic hashes, not actual form data.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">3. Use License</h2>
            <p className="text-gray-700 leading-relaxed bg-green-50 rounded-lg p-6">
              We grant you a non-exclusive, non-transferable, revocable license to use the Service for legitimate purposes in compliance with these Terms and applicable laws.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">4. User Responsibilities</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="mb-4 text-gray-700 font-semibold">You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Use the Service only for lawful purposes</li>
                <li>Not attempt to reverse-engineer or compromise the hashing process</li>
                <li>Not use the Service to process prohibited or illegal content</li>
                <li>Maintain the security of your Google account</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">5. Limitations of Service</h2>
            <div className="bg-yellow-50 rounded-lg p-6">
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>The Service provides cryptographic verification only</li>
                <li>We cannot recover original data from hashes</li>
                <li>Verification depends on the availability of our systems</li>
                <li>The Service does not guarantee legal compliance for your use case</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">6. Disclaimer of Warranties</h2>
            <div className="bg-red-50 rounded-lg p-6">
              <p className="text-gray-800 font-semibold">
                THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">7. Limitation of Liability</h2>
            <div className="bg-red-50 rounded-lg p-6">
              <p className="text-gray-800 font-semibold">
                IN NO EVENT SHALL notamperdata BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">8. Data Processing</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="mb-4 text-gray-700 font-semibold">By using the Service, you acknowledge that:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Only cryptographic hashes are transmitted to our servers</li>
                <li>Hashes may be stored indefinitely for verification purposes</li>
                <li>You have the necessary rights to process the form data</li>
              </ul>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">9. Termination</h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-6">
              You may terminate your use of the Service at any time by uninstalling the add-on. We reserve the right to suspend or terminate access to the Service for violation of these Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">10. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed bg-yellow-50 rounded-lg p-6">
              We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">11. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-6">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">12. Contact Information</h2>
            <div className="bg-gray-100 rounded-lg p-6">
              <p className="mb-4 text-gray-700">
                For questions about these Terms, please contact us at:
              </p>
              <div className="text-gray-800">
                <p className="mb-2"><strong>Email:</strong> <a href="mailto:johnndigirigi01@gmail.com" className="text-[#0033AD] hover:underline">johnndigirigi01@gmail.com</a></p>
                <p><strong>Website:</strong> <a href="https://notamperdata.vercel.app/support" className="text-[#0033AD] hover:underline">https://notamperdata.vercel.app/support</a></p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}