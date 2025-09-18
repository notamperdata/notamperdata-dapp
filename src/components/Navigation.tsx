"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Image 
                src="/Logo.png" 
                alt="NoTamperData Logo" 
                width={32} 
                height={32} 
                className="mr-3"
              />
              <span className="text-xl font-bold text-[#4285F4]">
                NoTamper<span className="text-[#0033AD]">Data</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link 
              href="/verify" 
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Verify
            </Link>
            <Link 
              href="/access" 
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Access Token
            </Link>
            <Link 
              href="/support" 
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Support
            </Link>
            <a 
              href="https://workspace.google.com/marketplace/app/NoTamperData" 
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 bg-[#0033AD] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#002A8C] transition-colors"
            >
              Get Add-on
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] transition-colors"
              aria-expanded="false"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen 
            ? 'max-h-64 opacity-100 border-t border-gray-200' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
            <Link 
              href="/verify" 
              onClick={closeMobileMenu}
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Verify
            </Link>
            <Link 
              href="/access" 
              onClick={closeMobileMenu}
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Access Token
            </Link>
            <Link 
              href="/support" 
              onClick={closeMobileMenu}
              className="text-gray-700 hover:text-[#4285F4] hover:bg-[#e8f0fe] block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Support
            </Link>
            <a 
              href="https://workspace.google.com/marketplace/app/NoTamperData" 
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobileMenu}
              className="bg-[#0033AD] text-white hover:bg-[#002A8C] block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Get Add-on
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}