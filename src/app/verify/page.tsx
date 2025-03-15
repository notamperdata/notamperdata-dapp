"use client";

import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Define types for our verification API response
interface VerificationResult {
  verified: boolean;
  message: string;
  metadata?: {
    formId: string;
    responseId: string;
    timestamp: string;
  };
  storedAt?: string;
}

type VerificationMethod = 'hash' | 'content';

export default function VerifyPage() {
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('hash');
  const [hash, setHash] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);

  // Function to create SHA-256 hash from a string
  const generateSHA256Hash = async (text: string): Promise<string> => {
    // Canonicalize the input by trimming whitespace
    const canonicalText = text.trim();
    
    // Use the Web Crypto API to create a hash
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalText);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  };

  const handleVerify = async () => {
    let hashToVerify: string;
    
    if (verificationMethod === 'hash') {
      if (!hash) {
        setError('Please enter a hash to verify');
        return;
      }
      hashToVerify = hash;
    } else {
      if (!content) {
        setError('Please enter content to hash and verify');
        return;
      }
      
      try {
        // Generate hash from content
        hashToVerify = await generateSHA256Hash(content);
        setGeneratedHash(hashToVerify);
      } catch (err) {
        setError('Failed to generate hash from content');
        console.log(err)
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash: hashToVerify }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="flex flex-col items-center justify-center min-h-[70vh]">
        <h1 className="text-3xl font-bold mb-8 text-center">
          AdaForms Response Verification
        </h1>

        <div className="w-full max-w-lg">
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Verify Response</h2>
            
            {/* Verification Method Selector */}
            <div className="mb-6">
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setVerificationMethod('hash')}
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    verificationMethod === 'hash'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Verify with Hash
                </button>
                <button
                  onClick={() => setVerificationMethod('content')}
                  className={`flex-1 py-2 px-4 text-sm font-medium ${
                    verificationMethod === 'content'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Hash & Verify Content
                </button>
              </div>
            </div>
            
            {/* Hash Input */}
            {verificationMethod === 'hash' && (
              <div className="mb-4">
                <label htmlFor="hash" className="block text-sm font-medium text-gray-700 mb-1">
                  Response Hash:
                </label>
                <input
                  type="text"
                  id="hash"
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  placeholder="Enter the SHA-256 hash"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            
            {/* Content Input */}
            {verificationMethod === 'content' && (
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Response Content:
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter the content to hash (JSON or text)"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Note: Whitespace will be trimmed before hashing.
                </p>
              </div>
            )}
            
            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Verifying...
                </span>
              ) : (
                'Verify'
              )}
            </button>
            
            {/* Show Generated Hash (Content Mode) */}
            {verificationMethod === 'content' && generatedHash && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="text-sm font-medium text-gray-700">Generated Hash:</h4>
                <p className="mt-1 text-xs font-mono break-all">{generatedHash}</p>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}
            
            {/* Result Display */}
            {result && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h3 className={`text-lg font-medium ${result.verified ? 'text-green-600' : 'text-red-600'}`}>
                  {result.verified ? '✅ Verified' : '❌ Not Verified'}
                </h3>
                <p className="mt-2 text-gray-700">{result.message}</p>
                
                {result.verified && result.metadata && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-sm">
                      <span className="font-semibold">Form ID:</span>
                      <span className="text-gray-700">{result.metadata.formId}</span>
                      
                      <span className="font-semibold">Response ID:</span>
                      <span className="text-gray-700">{result.metadata.responseId}</span>
                      
                      <span className="font-semibold">Timestamp:</span>
                      <span className="text-gray-700">{new Date(result.metadata.timestamp).toLocaleString()}</span>
                      
                      {result.storedAt && (
                        <>
                          <span className="font-semibold">Stored:</span>
                          <span className="text-gray-700">{new Date(result.storedAt).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}