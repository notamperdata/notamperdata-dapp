export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center text-[#0033AD]">Support Center</h1>
        
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Getting Started</h2>
            <ul className="space-y-3">
              <li>
                <a href="#installation" className="text-[#0033AD] hover:underline font-medium">
                  How to install the add-on
                </a>
              </li>
              <li>
                <a href="#first-use" className="text-[#0033AD] hover:underline font-medium">
                  Setting up automatic verification
                </a>
              </li>
              <li>
                <a href="#verify" className="text-[#0033AD] hover:underline font-medium">
                  Verifying form responses
                </a>
              </li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Troubleshooting</h2>
            <ul className="space-y-3">
              <li>
                <a href="#not-working" className="text-[#0033AD] hover:underline font-medium">
                  Add-on not working
                </a>
              </li>
              <li>
                <a href="#permissions" className="text-[#0033AD] hover:underline font-medium">
                  Permission issues
                </a>
              </li>
              <li>
                <a href="#verification-failed" className="text-[#0033AD] hover:underline font-medium">
                  Verification failures
                </a>
              </li>
            </ul>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div id="installation" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">How do I install the Adaverc add-on?</h3>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Open your Google Form</li>
                <li>Click on the puzzle piece icon (Add-ons) in the top right</li>
                <li>Search for &ldquo;Adaverc&rdquo; in the marketplace</li>
                <li>Click &ldquo;Install&rdquo; and accept the permissions</li>
                <li>Access the add-on from Add-ons → Adaverc → Open</li>
              </ol>
            </div>

            <div id="first-use" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">How do I enable automatic verification?</h3>
              <p className="mb-3 text-gray-700">Once the add-on is installed:</p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Open the Adaverc sidebar (Add-ons → Adaverc → Open)</li>
                <li>Click &ldquo;Enable Automatic Verification&rdquo;</li>
                <li>The status will change to &ldquo;Enabled&rdquo;</li>
                <li>All future form submissions will be automatically hashed and stored</li>
              </ol>
            </div>

            <div id="verify" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">How do I verify a form response?</h3>
              <p className="mb-3 text-gray-700">You can verify responses in two ways:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong className="text-gray-900">With the hash:</strong> Copy the hash from your records and paste it on the <a href="/verify" className="text-[#0033AD] hover:underline font-medium">verification page</a></li>
                <li><strong className="text-gray-900">With the content:</strong> Use the &ldquo;Hash &amp; Verify Content&rdquo; option to generate a hash from the response data and verify it</li>
              </ul>
            </div>

            <div id="not-working" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">Why isn&apos;t the add-on working?</h3>
              <p className="mb-3 text-gray-700">Common solutions:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Refresh the form page and try again</li>
                <li>Check your internet connection</li>
                <li>Ensure you have edit permissions for the form</li>
                <li>Try disabling and re-enabling automatic verification</li>
                <li>Clear your browser cache and cookies</li>
              </ul>
            </div>

            <div id="permissions" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">What permissions does the add-on need?</h3>
              <p className="mb-3 text-gray-700">Adaverc requires minimal permissions:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong className="text-gray-900">View and manage forms:</strong> To read form structure and responses for hashing</li>
                <li><strong className="text-gray-900">Connect to external service:</strong> To send hashes to our verification servers</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <strong>Privacy Note:</strong> We never store or have access to your actual form response data.
              </p>
            </div>

            <div id="verification-failed" className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-3 text-gray-900">Why did verification fail?</h3>
              <p className="mb-3 text-gray-700">Verification can fail if:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>The response was submitted before Adaverc was enabled</li>
                <li>The hash was incorrectly copied</li>
                <li>The response data was modified after submission</li>
                <li>There was a network error during the original submission</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Contact Support</h2>
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-[#0033AD]">
            <p className="mb-6 text-gray-700 text-lg">
              Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">Email Support</h4>
                <p className="text-gray-700">
                  <a href="mailto:support@adaverc.com" className="text-[#0033AD] hover:underline font-medium">
                    support@adaverc.com
                  </a>
                </p>
                <p className="text-sm text-gray-600 mt-1">Response within 24-48 hours</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">When Contacting Us</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  <li>Your form ID (if applicable)</li>
                  <li>Description of the issue</li>
                  <li>Error messages received</li>
                  <li>Steps you&apos;ve tried</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-8 text-gray-900">Additional Resources</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <a href="/docs" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-[#0033AD] transition-all group">
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#0033AD]">Documentation</h3>
              <p className="text-gray-600">Technical details and API reference</p>
            </a>
            <a href="/privacy" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-[#0033AD] transition-all group">
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#0033AD]">Privacy Policy</h3>
              <p className="text-gray-600">How we handle your data</p>
            </a>
            <a href="/terms" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg hover:border-[#0033AD] transition-all group">
              <h3 className="font-bold text-gray-900 mb-2 group-hover:text-[#0033AD]">Terms of Service</h3>
              <p className="text-gray-600">Usage terms and conditions</p>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}