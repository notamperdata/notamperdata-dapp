import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[70vh]">
      <main>
        <div className="relative isolate pt-14">
          <div className="py-24 sm:py-32 lg:pb-40">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Verify Google Forms Responses with Blockchain Technology
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  AdaForms provides immutable verification for Google Forms responses, ensuring data integrity through blockchain technology.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link href="/verify" className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                    Verify a response
                  </Link>
                  <Link href="/docs" className="text-sm font-semibold leading-6 text-gray-900">
                    Learn more <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              
              <div className="mt-16 flow-root sm:mt-24">
                <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
                  <div className="bg-white px-6 py-8 sm:p-10 sm:pb-12 lg:rounded-xl">
                    <div className="flex flex-wrap justify-center gap-y-6 gap-x-12">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">Privacy-Preserving</h3>
                        <p className="mt-2 text-gray-600">Only cryptographic hashes, not actual response data, leave Google&apos;s ecosystem</p>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">Deterministic Verification</h3>
                        <p className="mt-2 text-gray-600">Consistent hashing algorithm ensures reliable verification</p>
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900">Non-Interactive</h3>
                        <p className="mt-2 text-gray-600">After setup, the system operates automatically without requiring manual intervention</p>
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