import { Shield, CheckCircle, AlertCircle, FileText, Lock, Clock, Settings } from 'lucide-react';

export default function AddonGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Notice Banner */}
        <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-blue-900 font-medium">
                Add-on Not Yet in Marketplace
              </p>
              <p className="text-blue-800 text-sm mt-1">
                The NotamperData add-on is currently under Google's review process. 
                In the meantime, you can install it manually using our beta access method.
              </p>
              <a 
                href="https://pitch.com/v/notamperdata-user-testing-gm3fr2" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm underline"
              >
                Manual Installation Guide →
              </a>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            NotamperData Add-on User Guide
          </h1>
          <p className="text-lg text-gray-600">
            Secure your Google Forms responses with blockchain verification
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Shield className="w-6 h-6 mr-3 text-blue-600" />
            Quick Start Guide
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mr-4">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Install the Add-on</h3>
                <p className="text-gray-700">
                  Open your Google Form, click the puzzle piece icon (Add-ons), search for "NotamperData", and click Install. 
                  Accept the required permissions when prompted.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mr-4">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Open the Add-on</h3>
                <p className="text-gray-700">
                  In your Google Form, go to Add-ons → NotamperData → Open. The sidebar will appear on the right side of your screen.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mr-4">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Configure Access Token</h3>
                <p className="text-gray-700 mb-2">
                  Enter your NotamperData access token in the API Configuration section and click "Save Access Token".
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-600 space-y-2">
                  <p>
                    <strong>Get your token:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Purchase an access token from the{' '}
                      <a href="https://www.notamperdata.com/tokens" className="text-blue-600 hover:underline">
                        access token page
                      </a>{' '}
                      (Preview Testnet only at the moment)
                    </li>
                    <li>
                      <strong>OR</strong> for beta access, use the token provided in the{' '}
                      <a 
                        href="https://pitch.com/v/notamperdata-user-testing-gm3fr2" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        manual installation guide
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center mr-4">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Process Responses</h3>
                <p className="text-gray-700">
                  Click "Process Responses" to hash your form responses and store them on the Cardano blockchain. 
                  You can also set up automatic batch processing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Lock className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="font-semibold text-gray-900">Privacy-Preserving</h3>
              </div>
              <p className="text-gray-700">
                Only SHA-256 hashes of your responses are transmitted. Your actual form data never leaves Google's secure environment.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="font-semibold text-gray-900">Batch Processing</h3>
              </div>
              <p className="text-gray-700">
                Set up automatic processing on a daily, weekly, or custom schedule. Process responses manually anytime.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="font-semibold text-gray-900">Blockchain Verification</h3>
              </div>
              <p className="text-gray-700">
                Hashes are stored on the Cardano blockchain, providing immutable proof that your data hasn't been tampered with.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="font-semibold text-gray-900">Easy Verification</h3>
              </div>
              <p className="text-gray-700">
                Export your responses as CSV and upload to our verification portal to prove data integrity at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed Usage */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Settings className="w-6 h-6 mr-3 text-blue-600" />
            Detailed Usage Instructions
          </h2>

          <div className="space-y-8">
            {/* API Configuration */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">API Configuration</h3>
              <p className="text-gray-700 mb-3">
                Before you can use NotamperData, you need to configure your access token:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>In the add-on sidebar, find the "API Configuration" section</li>
                <li>Enter your access token (starts with "ak_")</li>
                <li>Click "Save Access Token"</li>
                <li>Click "Test Connection" to verify it works</li>
                <li>The status indicator will turn green when connected</li>
              </ol>
              <div className="mt-3 bg-blue-50 p-3 rounded text-sm text-gray-700">
                <strong>Security Note:</strong> Your token is stored securely in Google's infrastructure and is only used to authenticate with NotamperData servers.
              </div>
            </div>

            {/* Manual Processing */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Manual Processing</h3>
              <p className="text-gray-700 mb-3">
                To manually process all existing responses:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>Open the NotamperData add-on sidebar</li>
                <li>Scroll to "Manual Processing" section</li>
                <li>Click "Process Responses"</li>
                <li>Wait for the hash to be generated and stored (typically 3-10 seconds)</li>
                <li>A success message will show the hash that was stored</li>
              </ol>
              <p className="text-gray-700 mt-3">
                You can click the hash to open the verification page and confirm it was stored on the blockchain.
              </p>
            </div>

            {/* Batch Processing */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Batch Processing Setup</h3>
              <p className="text-gray-700 mb-3">
                To automatically process responses on a schedule:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>In the "Batch Processing" section, select your preferred frequency:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Manual Only:</strong> No automatic processing</li>
                    <li><strong>Daily:</strong> Process once per day at a specific time</li>
                    <li><strong>Weekly:</strong> Process once per week on a specific day and time</li>
                    <li><strong>Every X Hours:</strong> Process at regular intervals (1-168 hours)</li>
                  </ul>
                </li>
                <li>Configure the time and/or day based on your selection</li>
                <li>Click "Save Configuration"</li>
                <li>The system will automatically process responses according to your schedule</li>
              </ol>
              <div className="mt-3 bg-yellow-50 p-3 rounded text-sm text-gray-700">
                <strong>Note:</strong> Automatic triggers may take a few minutes to activate after saving your configuration.
              </div>
            </div>

            {/* Verification */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Verifying Your Data</h3>
              <p className="text-gray-700 mb-3">
                To verify that your form responses haven't been tampered with:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>In Google Forms, go to the "Responses" tab</li>
                <li>Click the three dots menu and select "Download responses (.csv)"</li>
                <li>Go to <a href="https://www.notamperdata.com/verify" className="text-blue-600 hover:underline">notamperdata.com/verify</a></li>
                <li>Upload your CSV file</li>
                <li>The system will generate a hash and check it against the blockchain</li>
                <li>You'll see a verification report showing whether your data is authentic</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Troubleshooting</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Add-on sidebar won't open</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Refresh the form page and try again</li>
                <li>Ensure you have edit permissions for the form</li>
                <li>Check that the add-on is properly installed</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Connection test fails</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Verify your access token is correct (should start with "ak_")</li>
                <li>Check your internet connection</li>
                <li>Make sure you've copied the entire token without extra spaces</li>
                <li>Generate a new token from your NotamperData dashboard if needed</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Verification fails with hash mismatch</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Ensure you're using the same CSV export format from Google Forms</li>
                <li>Don't modify the CSV file before verification</li>
                <li>On Windows, try exporting with different line endings if issues persist</li>
                <li>Make sure the responses were processed after the add-on was configured</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Batch processing not running</h3>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Wait a few minutes after saving configuration for triggers to activate</li>
                <li>Check that your configuration is saved (look at Processing Status)</li>
                <li>Ensure you have responses to process</li>
                <li>Try disabling and re-enabling batch processing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What data does NotamperData access?</h3>
              <p className="text-gray-700">
                NotamperData only accesses form structure and responses to generate cryptographic hashes. 
                No actual response content is transmitted or stored by NotamperData—only the hashes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How much does it cost?</h3>
              <p className="text-gray-700">
                Each hash storage operation costs approximately 0.17 ADA (~$0.05) in blockchain transaction fees. 
                This is significantly cheaper than traditional notarization services.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I verify old responses?</h3>
              <p className="text-gray-700">
                You can only verify responses that were processed after you installed and configured the add-on. 
                Past responses (before add-on setup) cannot be verified retroactively.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What permissions does the add-on need?</h3>
              <p className="text-gray-700">
                The add-on requires permission to view and manage your forms (to read structure and responses), 
                and permission to connect to external services (to send hashes to NotamperData). 
                These are minimal permissions necessary for functionality.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
              <p className="text-gray-700">
                Yes. Your actual form data never leaves Google's infrastructure. Only one-way cryptographic hashes 
                are sent to NotamperData servers. It's mathematically impossible to reverse a hash to get the original data.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Which blockchain network is used?</h3>
              <p className="text-gray-700">
                NotamperData uses the Cardano blockchain. Currently, hashes are stored on Preview Testnet for testing. 
                Mainnet deployment is planned for the next milestone.
              </p>
            </div>
          </div>
        </section>

        {/* Support CTA */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="mb-6 text-blue-100">
            Our support team is here to help you get the most out of NotamperData.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="https://www.notamperdata.com/support" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Contact Support
            </a>
            <a 
              href="https://github.com/notamperdata/notamperdata-addon" 
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors border-2 border-white"
            >
              View Documentation
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}