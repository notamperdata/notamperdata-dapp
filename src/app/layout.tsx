// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AdaForms - Blockchain Verification for Google Forms',
  description: 'Verify the integrity of Google Form responses using blockchain technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <a href="/" className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-indigo-600">AdaForms</span>
                </a>
              </div>
              <nav className="flex space-x-4">
                <a href="/verify" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                  Verify
                </a>
                <a href="/docs" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                  Documentation
                </a>
              </nav>
            </div>
          </div>
        </header>
        
        {children}
        
        <footer className="bg-white mt-12 border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} AdaForms. All rights reserved.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}