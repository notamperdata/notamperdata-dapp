"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Shield, FileText, Upload, Hash, Download, CheckCircle, XCircle, Clock, Lock } from 'lucide-react';

interface VerificationResult {
  verified: boolean;
  message: string;
  transactionHash?: string;
  metadata?: {
    hash: string;
    form_id: string;
    response_id: string;
    timestamp: number;
    version: string;
  };
  network?: string;
  blockchainProof?: {
    label: number;
    txHash: string;
    blockHeight?: number;
    confirmations?: number;
  };
}

type VerificationMethod = 'csv' | 'hash';

interface CsvRow {
  [key: string]: string;
}

interface StandardizedItem {
  title: string;
  response: string;
}

interface StandardizedResponse {
  responseId: string;
  items: StandardizedItem[];
}

interface StandardizedBatchData {
  responseCount: number;
  responses: StandardizedResponse[];
}

const LoadingSpinner = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

function VerifyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('csv');
  const [hash, setHash] = useState<string>(''); // Ensure always has a defined value
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');

  useEffect(() => {
    if (params?.hash && typeof params.hash === 'string') {
      setHash(params.hash);
      setVerificationMethod('hash');
    } 
    else if (searchParams?.get('hash')) {
      setHash(searchParams.get('hash') || '');
      setVerificationMethod('hash');
    }
  }, [params, searchParams]);

  useEffect(() => {
    if (verificationMethod === 'hash') {
      setCsvFile(null);
    } else {
      setHash('');
    }
    setError(null);
    setResult(null);
    setGeneratedHash(null);
    setProcessingStep('');
  }, [verificationMethod]);

  const createSha256Hash = async (input: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  };

  const createDeterministicHash = async (data: unknown): Promise<string> => {
    const replacer = (key: string, value: unknown): unknown => {
      if (Array.isArray(value)) {
        if (value.every(item => typeof item !== 'object' || item === null)) {
          return [...value].sort();
        }
        
        return value
          .map(item => JSON.stringify(item, replacer))
          .sort()
          .map(item => {
            try {
              return JSON.parse(item);
            } catch (e) {
              console.error("Parse error in hashing:", e);
              return item;
            }
          });
      }
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value as Record<string, unknown>).sort().reduce((obj: Record<string, unknown>, k) => {
          obj[k] = (value as Record<string, unknown>)[k];
          return obj;
        }, {});
      }
      
      return value;
    };
    
    const jsonString = JSON.stringify(data, replacer);
    const hash = await createSha256Hash(jsonString);
    return hash;
  };

  const parseCsv = (csvContent: string): CsvRow[] => {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least header and one data row');
    }
    
    const headers = lines[0].split(',').map(header => 
      header.replace(/^"(.*)"$/, '$1').trim()
    );
    
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => 
        value.replace(/^"(.*)"$/, '$1')
      );
      
      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    return rows;
  };

  const convertCsvToStandardizedFormat = (csvData: CsvRow[]): StandardizedBatchData => {
    const responses: StandardizedResponse[] = csvData.map((row, index) => {
      const fieldNames = Object.keys(row)
        .filter(fieldName => {
          const lowerField = fieldName.toLowerCase();
          return !lowerField.includes('timestamp') && 
                 !lowerField.includes('time') &&
                 !lowerField.includes('date');
        })
        .sort();
      
      const items = fieldNames.map((fieldName) => {
        return {
          title: fieldName,
          response: row[fieldName] !== null && row[fieldName] !== undefined ? String(row[fieldName]) : ""
        };
      });

      return {
        responseId: `response-${index}`,
        items: items
      };
    });

    return {
      responseCount: responses.length,
      responses: responses
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError(null);
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
        
        setProcessingStep('Parsing CSV data...');
        const csvData = parseCsv(csvContent);
        
        setProcessingStep('Standardizing data format...');
        const standardized = convertCsvToStandardizedFormat(csvData);
        
        setProcessingStep('Generating hash from standardized data...');
        hashToVerify = await createDeterministicHash(standardized);
        setGeneratedHash(hashToVerify);
      } catch (err) {
        setError('Failed to process CSV file: ' + (err instanceof Error ? err.message : 'Unknown error'));
        console.error('CSV processing error:', err);
        return;
      }
    } else {
      setError('Invalid verification method');
      return;
    }
    
    setLoading(true);
    setProcessingStep('Verifying hash on blockchain...');
    
    try {
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
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const generatePdfReport = () => {
    if (!result) return;

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      setError('Please allow popups to download the report');
      return;
    }

    const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>NoTamperData Verification Report</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          margin: 40px; 
          color: #202124; 
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #4285F4; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .logo { 
          color: #4285F4; 
          font-size: 28px; 
          font-weight: bold; 
          margin-bottom: 10px; 
        }
        .subtitle { 
          color: #5f6368; 
          font-size: 14px; 
        }
        .status { 
          text-align: center; 
          margin: 30px 0; 
          padding: 20px; 
          border-radius: 8px; 
        }
        .verified { 
          background-color: #e8f5e8; 
          border: 2px solid #34a853; 
          color: #137333; 
        }
        .not-verified { 
          background-color: #fce8e6; 
          border: 2px solid #ea4335; 
          color: #d93025; 
        }
        .status-icon { 
          font-size: 48px; 
          margin-bottom: 10px; 
        }
        .status-title { 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 5px; 
        }
        .details { 
          background-color: #f8f9fa; 
          padding: 20px; 
          border-radius: 8px; 
          margin-top: 20px; 
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 8px 0; 
          border-bottom: 1px solid #e8eaed; 
        }
        .detail-row:last-child { 
          border-bottom: none; 
        }
        .detail-label { 
          font-weight: 600; 
          color: #5f6368; 
        }
        .detail-value { 
          font-family: monospace; 
          word-break: break-all; 
          max-width: 60%; 
        }
        .footer { 
          text-align: center; 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #e8eaed; 
          color: #5f6368; 
          font-size: 12px; 
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🛡️ NoTamperData</div>
        <div class="subtitle">Blockchain Dataset Verification Report</div>
        <div class="subtitle">Generated on ${new Date().toLocaleString()}</div>
      </div>

      <div class="status ${result.verified ? 'verified' : 'not-verified'}">
        <div class="status-icon">${result.verified ? '✅' : '❌'}</div>
        <div class="status-title">${result.verified ? 'Dataset Verified' : 'Verification Failed'}</div>
        <div>${result.message}</div>
      </div>

      ${result.verified ? `
        <div class="details">
          <h3 style="margin-top: 0; color: #202124;">Verification Details</h3>
          ${result.metadata?.form_id ? `
            <div class="detail-row">
              <span class="detail-label">Form ID:</span>
              <span class="detail-value">${result.metadata.form_id}</span>
            </div>
          ` : ''}
          ${result.metadata?.response_id ? `
            <div class="detail-row">
              <span class="detail-label">Response ID:</span>
              <span class="detail-value">${result.metadata.response_id}</span>
            </div>
          ` : ''}
          ${result.metadata?.timestamp ? `
            <div class="detail-row">
              <span class="detail-label">Timestamp:</span>
              <span class="detail-value">${new Date(result.metadata.timestamp).toLocaleString()}</span>
            </div>
          ` : ''}
          ${result.transactionHash ? `
            <div class="detail-row">
              <span class="detail-label">Transaction Hash:</span>
              <span class="detail-value">${result.transactionHash}</span>
            </div>
          ` : ''}
          ${result.network ? `
            <div class="detail-row">
              <span class="detail-label">Blockchain Network:</span>
              <span class="detail-value">${result.network}</span>
            </div>
          ` : ''}
          ${result.blockchainProof?.confirmations ? `
            <div class="detail-row">
              <span class="detail-label">Confirmations:</span>
              <span class="detail-value">${result.blockchainProof.confirmations}</span>
            </div>
          ` : ''}
          ${generatedHash ? `
            <div class="detail-row">
              <span class="detail-label">Dataset Hash:</span>
              <span class="detail-value">${generatedHash}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="footer">
        <p><strong>NoTamperData Verification System</strong></p>
        <p>This report certifies that the dataset has been cryptographically verified against blockchain records.</p>
        <p>The verification process ensures data integrity and authenticity through immutable blockchain storage.</p>
        <p>For more information, visit: notamperdata.com</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
    `;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4285F4] rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#202124] mb-2">
            Dataset Verification
          </h1>
          <p className="text-lg text-[#5f6368] max-w-2xl mx-auto">
            Verify the integrity and authenticity of your research data using blockchain technology
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#4285F4] to-[#0033AD] px-8 py-6">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Blockchain Verification Portal
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Cryptographically verify your dataset against immutable blockchain records
              </p>
            </div>

            <div className="p-8">
              <div className="mb-8">
                <label className="block text-sm font-semibold text-[#202124] mb-3">
                  Verification Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setVerificationMethod('csv')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      verificationMethod === 'csv'
                        ? 'border-[#4285F4] bg-[#4285F4]/5 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${
                      verificationMethod === 'csv' ? 'text-[#4285F4]' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-[#202124]">CSV Verification</div>
                    <div className="text-xs text-[#5f6368] mt-1">Upload CSV file directly</div>
                  </button>

                  <button
                    onClick={() => setVerificationMethod('hash')}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                      verificationMethod === 'hash'
                        ? 'border-[#4285F4] bg-[#4285F4]/5 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Hash className={`w-6 h-6 mx-auto mb-2 ${
                      verificationMethod === 'hash' ? 'text-[#4285F4]' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-medium text-[#202124]">Hash Verification</div>
                    <div className="text-xs text-[#5f6368] mt-1">Verify using SHA-256 hash</div>
                  </button>
                </div>
              </div>

              <div className="mb-8">
                {verificationMethod === 'csv' ? (
                  <div>
                    <label htmlFor="csv-file" className="block text-sm font-semibold text-[#202124] mb-3">
                      Upload CSV Dataset
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="csv-file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        value="" // Reset file input value to prevent controlled/uncontrolled warning
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] text-[#202124] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[#4285F4] file:text-white hover:file:bg-[#366ac7]"
                      />
                      <Upload className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                    </div>
                    {csvFile && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-[#5f6368]">
                      Upload the CSV file exported directly from your Google Form responses
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="hash" className="block text-sm font-semibold text-[#202124] mb-3">
                      Response Hash
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="hash"
                        value={hash}
                        onChange={(e) => setHash(e.target.value)}
                        placeholder="Enter your 64-character SHA-256 hash"
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:border-[#4285F4] text-[#202124] placeholder-gray-400"
                      />
                      <Hash className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                    </div>
                    <p className="mt-2 text-xs text-[#5f6368]">
                      This hash should be exactly 64 characters long and provided by your verification tool
                    </p>
                  </div>
                )}
              </div>

              {processingStep && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center text-blue-700">
                    <LoadingSpinner className="w-5 h-5 mr-3" />
                    <span className="font-medium">{processingStep}</span>
                  </div>
                </div>
              )}

              {generatedHash && (
                <div className="mb-6 p-4 bg-[#e8f0fe] border border-[#4285F4] rounded-xl">
                  <h4 className="text-sm font-semibold text-[#202124] mb-2 flex items-center">
                    <Hash className="w-4 h-4 mr-2" />
                    Generated Dataset Hash
                  </h4>
                  <p className="text-xs font-mono break-all text-[#5f6368] bg-white p-3 rounded-lg border">
                    {generatedHash}
                  </p>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || (verificationMethod === 'hash' && !hash) || (verificationMethod === 'csv' && !csvFile)}
                className="w-full bg-gradient-to-r from-[#4285F4] to-[#0033AD] text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <LoadingSpinner className="mr-3 h-5 w-5" />
                    Verifying on Blockchain...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Verify Dataset Integrity
                  </span>
                )}
              </button>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center text-red-700">
                    <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              )}

              {result && (
                <div className="mt-8">
                  <div className={`p-6 rounded-xl border-2 ${
                    result.verified 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                        result.verified ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {result.verified ? (
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-600" />
                        )}
                      </div>
                      <h3 className={`text-2xl font-bold ${
                        result.verified ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.verified ? 'Dataset Verified Successfully' : 'Verification Failed'}
                      </h3>
                      <p className={`mt-2 ${
                        result.verified ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.message}
                      </p>
                    </div>

                    {result.verified && result.metadata && (
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-lg font-semibold text-[#202124] mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2" />
                          Blockchain Verification Details
                        </h4>
                        <div className="space-y-3">
                          {result.metadata.form_id && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="font-medium text-[#5f6368]">Form ID</span>
                              <span className="font-mono text-sm text-[#202124]">{result.metadata.form_id}</span>
                            </div>
                          )}
                          {result.metadata.response_id && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="font-medium text-[#5f6368]">Response ID</span>
                              <span className="font-mono text-sm text-[#202124]">{result.metadata.response_id}</span>
                            </div>
                          )}
                          {result.metadata.timestamp && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="font-medium text-[#5f6368]">Verification Time</span>
                              <span className="font-mono text-sm text-[#202124] flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                {new Date(result.metadata.timestamp).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {result.transactionHash && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="font-medium text-[#5f6368]">Transaction Hash</span>
                              <span className="font-mono text-xs text-[#202124] break-all max-w-xs">{result.transactionHash}</span>
                            </div>
                          )}
                          {result.network && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="font-medium text-[#5f6368]">Blockchain Network</span>
                              <span className="font-mono text-sm text-[#202124]">{result.network}</span>
                            </div>
                          )}
                          {result.blockchainProof?.confirmations && (
                            <div className="flex justify-between items-center py-2">
                              <span className="font-medium text-[#5f6368]">Network Confirmations</span>
                              <span className="font-mono text-sm text-[#202124]">{result.blockchainProof.confirmations}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {result.verified && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={generatePdfReport}
                          className="inline-flex items-center px-6 py-3 bg-white border-2 border-green-600 text-green-700 rounded-xl font-semibold hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Download Verification Report
                        </button>
                        <p className="text-xs text-green-600 mt-2">
                          Generate a PDF certificate for your records
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-[#34a853]/10 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-[#34a853]" />
                </div>
                <h3 className="font-semibold text-[#202124]">Blockchain Security</h3>
              </div>
              <p className="text-sm text-[#5f6368]">
                Your data integrity is verified using immutable blockchain technology, ensuring tamper-proof verification.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-[#4285F4]/10 rounded-lg flex items-center justify-center mr-3">
                  <Lock className="w-5 h-5 text-[#4285F4]" />
                </div>
                <h3 className="font-semibold text-[#202124]">Privacy Protected</h3>
              </div>
              <p className="text-sm text-[#5f6368]">
                Only cryptographic hashes are stored on the blockchain - your actual data remains private and secure.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center text-sm text-[#5f6368]">
            <Shield className="w-4 h-4 mr-2" />
            Powered by <strong className="ml-1 mr-1 text-[#4285F4]">NoTamperData</strong> verification technology
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#4285F4] to-[#0033AD] px-8 py-6">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Blockchain Verification Portal
              </h2>
            </div>
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner className="h-8 w-8 mr-3" />
              <span className="text-[#5f6368] text-lg">Loading verification portal...</span>
            </div>
          </div>
        </div>
      </div>
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