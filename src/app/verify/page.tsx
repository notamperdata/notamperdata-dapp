"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Papa from 'papaparse';

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

type VerificationMethod = 'hash' | 'json' | 'csv';

interface StandardizedResponse {
  responseId: string;
  items: Array<{
    title: string;
    response: string;
  }>;
}

interface StandardizedBatchData {
  responseCount: number;
  responses: StandardizedResponse[];
}

function VerifyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('hash');
  const [hash, setHash] = useState<string>('');
  const [jsonContent, setJsonContent] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Check for hash in URL on component mount
  useEffect(() => {
    // Check if hash is provided in URL path (e.g., /verify/abc123...)
    if (params?.hash && typeof params.hash === 'string') {
      setHash(params.hash);
      setVerificationMethod('hash');
    } 
    // Check if hash is provided as search parameter (e.g., /verify?hash=abc123...)
    else if (searchParams?.get('hash')) {
      setHash(searchParams.get('hash') || '');
      setVerificationMethod('hash');
    }
  }, [params, searchParams]);

  // Function to create a deterministic hash exactly matching the add-on
  const generateDeterministicHash = async (input: unknown): Promise<string> => {
    try {
      // Ensure consistent JSON representation
      const jsonData = JSON.stringify(input, replacer);
      
      // Hash the prepared JSON string
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert the hash to a hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (err) {
      console.error('Error generating hash:', err);
      throw new Error('Failed to generate hash');
    }
  };
  
  // Replacer function for JSON.stringify that ensures deterministic output
  // This must match exactly the logic in the Google Apps Script add-on
  function replacer(key: string, value: unknown) {
    // Handle arrays to ensure consistent ordering
    if (Array.isArray(value)) {
      // Sort simple arrays by their string representation
      if (value.every(item => typeof item !== 'object' || item === null)) {
        return [...value].sort();
      }
      
      // For arrays of objects, sort by stringifying their contents
      return value
        .map(item => JSON.stringify(item, replacer))
        .sort()
        .map(item => {
          try {
            return JSON.parse(item);
          } catch (_error) {
            console.log("Parse error:", _error);
            return item;
          }
        });
    }
    
    // Handle objects to ensure consistent key ordering
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((result: Record<string, unknown>, key) => {
          result[key] = (value as Record<string, unknown>)[key];
          return result;
        }, {});
    }
    
    return value;
  }

  // Convert CSV to standardized format matching the add-on's standardization
  const convertCsvToStandardizedFormat = (csvData: string): StandardizedBatchData => {
    setProcessingStep('Parsing CSV data...');
    
    // Parse CSV with robust options
    const parseResult = Papa.parse(csvData, {
      header: true,
      dynamicTyping: false, // Keep as strings to match add-on
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      transformHeader: (header: string) => header.trim() // Remove whitespace from headers
    });

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors);
    }

    const rows = parseResult.data as Record<string, string>[];
    setProcessingStep('Standardizing data format to match add-on...');

    // Convert CSV rows to standardized form response format (matching add-on logic)
    const responses: StandardizedResponse[] = rows.map((row, index) => {
      // Get field names and sort them alphabetically (matches add-on sorting)
      const fieldNames = Object.keys(row).sort();
      
      const items = fieldNames.map((fieldName) => ({
        title: fieldName,
        response: row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : ""
      }));

      return {
        responseId: `response-${index}`, // Matches add-on pattern
        // No timestamp - removed to match add-on standardization
        items: items
      };
    });

    // Create standardized batch data structure matching the add-on
    const standardizedBatch: StandardizedBatchData = {
      responseCount: responses.length,
      responses: responses
    };

    return standardizedBatch;
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleVerify = async () => {
    let hashToVerify: string;
    setError(null);
    setGeneratedHash(null);
    setProcessingStep('');
    
    if (verificationMethod === 'hash') {
      if (!hash) {
        setError('Please enter a hash to verify');
        return;
      }
      hashToVerify = hash;
    } 
    else if (verificationMethod === 'json') {
      if (!jsonContent) {
        setError('Please enter JSON content to hash and verify');
        return;
      }
      
      try {
        setProcessingStep('Parsing JSON...');
        let contentValue: unknown;
        try {
          contentValue = JSON.parse(jsonContent);
        } catch (_e) {
          console.log("JSON parse error:", _e);
          // Not valid JSON, use as plain text
          contentValue = jsonContent;
        }
        
        setProcessingStep('Generating hash...');
        hashToVerify = await generateDeterministicHash(contentValue);
        console.log("Generated hash from JSON:", hashToVerify);
        setGeneratedHash(hashToVerify);
      } catch (err) {
        setError('Failed to generate hash from JSON content');
        console.error(err);
        return;
      }
    }
    else if (verificationMethod === 'csv') {
      if (!csvFile) {
        setError('Please select a CSV file to process');
        return;
      }
      
      try {
        setProcessingStep('Reading CSV file...');
        const csvContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(csvFile);
        });
        
        // Convert CSV to standardized format (matching add-on standardization)
        const standardizedData = convertCsvToStandardizedFormat(csvContent);
        console.log("Standardized data from CSV:", standardizedData);
        
        setProcessingStep('Generating hash from standardized data...');
        hashToVerify = await generateDeterministicHash(standardizedData);
        console.log("Generated hash from standardized CSV:", hashToVerify);
        setGeneratedHash(hashToVerify);
      } catch (err) {
        setError('Failed to process CSV file');
        console.error(err);
        return;
      }
    } else {
      setError('Invalid verification method');
      return;
    }
    
    setLoading(true);
    setProcessingStep('Verifying hash...');
    
    try {
      console.log("Verifying hash:", hashToVerify);
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash: hashToVerify }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Verification API error:", errorText);
        throw new Error("The hash could not be verified");
      }
      
      const data = await response.json();
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
      setProcessingStep('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <main className="flex flex-col items-center justify-center min-h-[70vh]">
        <h1 className="text-3xl font-bold mb-8 text-center text-[#4285F4]">
          Adaverc Dataset Verification
        </h1>

        <div className="w-full max-w-lg">
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <div className="border-l-4 border-[#4285F4] pl-3 mb-6">
              <h2 className="text-xl font-semibold text-[#202124]">Verify Dataset</h2>
              <p className="text-sm text-gray-500">Check research data validity using blockchain</p>
            </div>
            
            {/* Verification Method Selector */}
            <div className="mb-6">
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setVerificationMethod('hash')}
                  className={`flex-1 py-2 px-3 text-sm font-medium ${
                    verificationMethod === 'hash'
                      ? 'bg-[#4285F4] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Hash
                </button>
                <button
                  onClick={() => setVerificationMethod('json')}
                  className={`flex-1 py-2 px-3 text-sm font-medium ${
                    verificationMethod === 'json'
                      ? 'bg-[#4285F4] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  JSON
                </button>
                <button
                  onClick={() => setVerificationMethod('csv')}
                  className={`flex-1 py-2 px-3 text-sm font-medium ${
                    verificationMethod === 'csv'
                      ? 'bg-[#4285F4] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  CSV
                </button>
              </div>
              
              {/* Information about CSV verification */}
              {verificationMethod === 'csv' && (
                <div className="mt-2 p-3 bg-green-50 border-l-4 border-green-400 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        CSV Verification Now Supported
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          CSV files are now processed using the same standardization as the Google Forms add-on, 
                          ensuring hash compatibility between original form responses and CSV exports.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4285F4] focus:border-[#4285F4]"
                />
              </div>
            )}
            
            {/* JSON Input */}
            {verificationMethod === 'json' && (
              <div className="mb-4">
                <label htmlFor="json-content" className="block text-sm font-medium text-gray-700 mb-1">
                  JSON Content:
                </label>
                <textarea
                  id="json-content"
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  placeholder="Enter JSON data or plain text"
                  rows={5}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4285F4] focus:border-[#4285F4]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter JSON data that will be standardized and hashed.
                </p>
              </div>
            )}

            {/* CSV Upload */}
            {verificationMethod === 'csv' && (
              <div className="mb-4">
                <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File:
                </label>
                <input
                  type="file"
                  id="csv-file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4285F4] focus:border-[#4285F4]"
                />
                {csvFile && (
                  <p className="mt-1 text-xs text-green-600">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Upload CSV file exported from your Google Form. Will be standardized to match the add-on&apos;s hash format.
                </p>
              </div>
            )}
            
            {/* Processing Step Display */}
            {processingStep && (
              <div className="mb-4 p-3 bg-blue-50 border-l-4 border-[#4285F4] rounded-md">
                <p className="text-sm text-blue-700">
                  <LoadingSpinner className="inline mr-2 h-3 w-3" />
                  {processingStep}
                </p>
              </div>
            )}
            
            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-[#4285F4] text-white py-2 px-4 rounded-md hover:bg-[#366ac7] focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            
            {/* Show Generated Hash */}
            {generatedHash && (
              <div className="mt-4 p-3 bg-[#e8f0fe] border-l-4 border-[#4285F4] rounded-md">
                <h4 className="text-sm font-medium text-gray-700">Generated Hash:</h4>
                <p className="mt-1 text-xs font-mono break-all text-gray-600">{generatedHash}</p>
              </div>
            )}
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-md text-red-700">
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
                      <span className="font-semibold text-gray-600">Form ID:</span>
                      <span className="text-gray-700">{result.metadata.formId}</span>
                      
                      <span className="font-semibold text-gray-600">Response ID:</span>
                      <span className="text-gray-700">{result.metadata.responseId}</span>
                      
                      <span className="font-semibold text-gray-600">Timestamp:</span>
                      <span className="text-gray-700">{new Date(result.metadata.timestamp).toLocaleString()}</span>
                      
                      {result.storedAt && (
                        <>
                          <span className="font-semibold text-gray-600">Stored:</span>
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
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center">
            <p>Powered by Adaverc verification technology</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Loading fallback for Suspense
function VerifyLoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <main className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-lg">
          <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8 mr-3" />
              <span className="text-gray-600">Loading verification page...</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}