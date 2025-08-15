import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[70vh]">
      <main>
        <div className="relative isolate pt-14">
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <div className="flex justify-center mb-6">
                  <Image 
                    src="/Logo.png" 
                    alt="NoTamperData Logo" 
                    width={64}
                    height={64}
                    priority
                  />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-[#202124] sm:text-6xl">
                  Verify Research Data with Blockchain
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  NoTamperData provides immutable verification for Google Forms responses, ensuring data integrity through Cardano blockchain technology.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link href="/verify" className="rounded-md bg-[#0033AD] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#002A8C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0033AD]">
                    Verify a response
                  </Link>
                  <Link href="/access" className="text-sm font-semibold leading-6 text-[#4285F4]">
                    Get Access Token <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              
              <div className="mt-16 flow-root sm:mt-24">
                <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
                  <div className="bg-white px-6 py-8 sm:p-10 sm:pb-12 lg:rounded-xl">
                    <div className="flex flex-wrap justify-center gap-y-8 gap-x-12">
                      <div className="text-center max-w-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EA4335] bg-opacity-10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#EA4335" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold leading-6 text-gray-900">Secure Verification</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          Your form responses are hashed and stored on Cardano blockchain for immutable verification.
                        </p>
                      </div>

                      <div className="text-center max-w-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FBBC04] bg-opacity-10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#FBBC04" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold leading-6 text-gray-900">Easy Integration</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          Simply install our Google Workspace add-on to start verifying your form responses automatically.
                        </p>
                      </div>

                      <div className="text-center max-w-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34A853] bg-opacity-10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#34A853" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                          </svg>
                        </div>
                        <h3 className="mt-4 text-sm font-semibold leading-6 text-gray-900">Research Ready</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          Perfect for academic research, surveys, and any data collection requiring verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* How it Works Section */}
              <div className="mt-32">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="text-3xl font-bold tracking-tight text-[#202124] sm:text-4xl">
                    How NoTamperData Works
                  </h2>
                  <p className="mt-4 text-lg leading-8 text-gray-600">
                    Simple steps to secure your form data with blockchain verification
                  </p>
                </div>

                <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                  <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                    <div className="flex flex-col">
                      <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[#202124]">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#4285F4]">
                          <span className="text-white font-bold">1</span>
                        </div>
                        Install Add-on
                      </dt>
                      <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                        <p className="flex-auto">Install the NoTamperData add-on from the Google Workspace Marketplace and configure it for your forms.</p>
                      </dd>
                    </div>

                    <div className="flex flex-col">
                      <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[#202124]">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#34A853]">
                          <span className="text-white font-bold">2</span>
                        </div>
                        Collect Responses
                      </dt>
                      <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                        <p className="flex-auto">Continue using Google Forms as normal. Responses automatically or manually hashed and stored on the blockchain as configured.</p>
                      </dd>
                    </div>

                    <div className="flex flex-col">
                      <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[#202124]">
                        <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-[#EA4335]">
                          <span className="text-white font-bold">3</span>
                        </div>
                        Verify Integrity
                      </dt>
                      <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                        <p className="flex-auto">Use our verification tool to confirm that your responses haven't been tampered with since collection.</p>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* CTA Section */}
              <div className="mt-24 rounded-3xl bg-[#0033AD] py-16 px-6 text-center ring-1 ring-inset ring-gray-900/10 lg:px-20">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Ready to secure your research data?
                </h2>
                <p className="mt-4 text-lg leading-8 text-blue-100">
                  Start using NoTamperData today and ensure the integrity of your Google Forms responses.
                </p>
                <div className="mt-8 flex items-center justify-center gap-x-6">
                  <a
                    href="https://workspace.google.com/marketplace/app/NoTamperData"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0033AD] shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Install Add-on
                  </a>
                  <Link href="/verify" className="text-sm font-semibold leading-6 text-white">
                    Try verification <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}