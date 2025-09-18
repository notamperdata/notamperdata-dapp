import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import './globals.css';

const roboto = Roboto({ 
 subsets: ['latin'],
 weight: ['400', '500', '700'],
 display: 'swap',
 variable: '--font-roboto'
});

export const metadata: Metadata = {
 title: 'NoTamperData - Blockchain Verification for Google Forms',
 description: 'Verify the integrity of Google Form responses using Cardano blockchain technology',
 icons: {
   icon: '/Logo.ico',
 },
};

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
   <html lang="en">
     <body className={`${roboto.className} ${roboto.variable} bg-white min-h-screen`}>
       <Navigation />
       
       <div className='bg-white'>
         {children}
       </div>
       
       <footer className="bg-white border-t border-gray-200">
         <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
           <div className="flex flex-col items-center md:flex-row md:justify-between">
             <div className="flex items-center mb-4 md:mb-0">
               <Image 
                 src="/Logo.png" 
                 alt="NoTamperData Logo" 
                 width={24} 
                 height={24} 
                 className="mr-2"
               />
               <span className="text-sm font-semibold text-[#0033AD]">NoTamperData</span>
             </div>
             <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-center">
               <Link href="/privacy" className="text-sm text-gray-500 hover:text-[#0033AD] transition-colors">
                 Privacy Policy
               </Link>
               <Link href="/terms" className="text-sm text-gray-500 hover:text-[#0033AD] transition-colors">
                 Terms of Service
               </Link>
               <Link href="/support" className="text-sm text-gray-500 hover:text-[#0033AD] transition-colors">
                 Contact
               </Link>
             </div>
             <div className="text-sm text-gray-500 mt-4 md:mt-0">
               &copy; 2024 NoTamperData. All rights reserved.
             </div>
           </div>
         </div>
       </footer>
     </body>
   </html>
 );
}