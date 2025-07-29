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
                  <Link href="/docs" className="text-sm font-semibold leading-6 text-[#4285F4]">
                    Learn more <span aria-hidden="true">→</span>
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
                        <h3 className="mt-3 text-lg font-semibold text-[#202124]">Privacy-Preserving</h3>
                        <p className="mt-2 text-gray-600">Only cryptographic hashes, not actual response data, leave Google&apos;s ecosystem</p>
                      </div>
                      <div className="text-center max-w-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34A853] bg-opacity-10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#34A853" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-[#202124]">Deterministic Verification</h3>
                        <p className="mt-2 text-gray-600">Consistent hashing algorithm ensures reliable verification</p>
                      </div>
                      <div className="text-center max-w-xs">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FBBC05] bg-opacity-10">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#FBBC05" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-[#202124]">Non-Interactive</h3>
                        <p className="mt-2 text-gray-600">After setup, the system operates automatically without requiring manual intervention</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 flex justify-center">
                  <div className="relative rounded-lg overflow-hidden">
                    <div className="px-6 py-8 bg-[#0033AD] sm:px-10 sm:py-10">
                      <div className="relative max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ready to get started?</h2>
                        <p className="mt-3 text-lg leading-6 text-white opacity-90">
                          Install the Google Workspace add-on to start securing your form responses.
                        </p>
                        <div className="mt-8 flex justify-center">
                          <a
                            href="#"
                            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0033AD] shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            Get the Add-on
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}