// src/app/access/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, AlertCircle, Wallet, CreditCard, Key, Mail, ExternalLink } from 'lucide-react';
import WalletConnector from '@/components/wallet/WalletConnector';

interface WalletAPI {
  getBalance(): Promise<string>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
  getUtxos(amount?: string): Promise<string[]>;
  enable(): Promise<WalletAPI>;
  isEnabled(): Promise<boolean>;
}

interface GeneratedApiKey {
  success: boolean;
  apiKey?: string;
  tokens?: number;
  adaAmount?: number;
  transactionHash?: string;
  error?: string;
  message?: string;
}

export default function AccessPage() {
  const [connectedWallet, setConnectedWallet] = useState<{
    name: string;
    api: WalletAPI;
    address: string;
  } | null>(null);
  
  const [tokenAmount, setTokenAmount] = useState<number>(10);
  const [email, setEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<GeneratedApiKey | null>(null);
  const [step, setStep] = useState<'connect' | 'configure' | 'payment' | 'complete'>('connect');
  const [txHash, setTxHash] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!connectedWallet) {
      setStep('connect');
      setGeneratedApiKey(null);
      setTxHash('');
    }
  }, [connectedWallet]);

  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS || 'addr_test1wqg448fq8u4ry04dtf3jsxqhw0avejz887ze5x0mtgpgw9gzzhue3';

  const handleWalletConnect = (wallet: { name: string; api: WalletAPI; address: string }) => {
    setConnectedWallet(wallet);
    setStep('configure');
  };

  const handleWalletDisconnect = () => {
    setConnectedWallet(null);
    setStep('connect');
    setGeneratedApiKey(null);
    setTxHash('');
  };

  const handleProceedToPayment = () => {
    if (tokenAmount < 1) {
      alert('Minimum 1 token required');
      return;
    }
    setStep('payment');
  };

  const handlePayment = async () => {
    if (!connectedWallet) {
      alert('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    
    try {
      // For now, we'll simulate the payment process
      // In a real implementation, you would use a proper transaction builder
      // like Lucid, MeshSDK, or similar library
      
      alert(`This would send ${tokenAmount} ADA to ${platformAddress}. For MVP, please send the payment manually and then provide the transaction hash.`);
      
      // For demo purposes, generate a mock transaction hash
      // In production, this would come from the actual transaction
      const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Prompt user to enter their actual transaction hash
      const actualTxHash = prompt('Please enter your transaction hash after sending the payment:');
      
      if (actualTxHash && actualTxHash.length === 64) {
        setTxHash(actualTxHash);
        await generateApiKey(actualTxHash);
      } else {
        throw new Error('Invalid transaction hash provided');
      }

    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateApiKey = async (transactionHash: string) => {
    try {
      console.log('Generating API key for transaction:', transactionHash);

      const response = await fetch('/api/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: transactionHash,
          email: email || undefined
        }),
      });

      const result: GeneratedApiKey = await response.json();
      
      if (result.success) {
        setGeneratedApiKey(result);
        setStep('complete');
        console.log('API key generated successfully:', result.apiKey);
      } else {
        throw new Error(result.error || 'Failed to generate API key');
      }

    } catch (error) {
      console.error('API key generation failed:', error);
      alert(`API key generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Get Your API Key
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Purchase tokens to access NoTamperData storage services. Connect your Cardano wallet, 
            choose your token amount, and get instant access to blockchain-based form verification.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {[
                { key: 'connect', label: 'Connect Wallet', icon: Wallet },
                { key: 'configure', label: 'Configure Purchase', icon: CreditCard },
                { key: 'payment', label: 'Send Payment', icon: ExternalLink },
                { key: 'complete', label: 'Get API Key', icon: Key }
              ].map(({ key, label, icon: Icon }, index) => (
                <React.Fragment key={key}>
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    step === key 
                      ? 'bg-blue-600 text-white' 
                      : index < ['connect', 'configure', 'payment', 'complete'].indexOf(step)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  {index < 3 && (
                    <div className={`w-8 h-px ${
                      index < ['connect', 'configure', 'payment', 'complete'].indexOf(step)
                        ? 'bg-green-300'
                        : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            
            {/* Step 1: Connect Wallet */}
            {step === 'connect' && (
              <div className="text-center">
                <Wallet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Cardano Wallet</h2>
                <p className="text-gray-600 mb-8">
                  Connect your Cardano wallet to purchase API tokens securely
                </p>
                
                <WalletConnector 
                  onConnect={handleWalletConnect}
                  onDisconnect={handleWalletDisconnect}
                  connectedWallet={connectedWallet}
                />
              </div>
            )}

            {/* Step 2: Configure Purchase */}
            {step === 'configure' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configure Your Purchase</h2>
                
                {/* Connected Wallet Info */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Connected to {connectedWallet?.name}
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Address: {connectedWallet?.address?.substring(0, 20)}...
                  </p>
                </div>

                {/* Token Amount Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Tokens
                  </label>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[5, 10, 25, 50].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTokenAmount(amount)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          tokenAmount === amount
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold">{amount}</div>
                        <div className="text-xs text-gray-500">{amount} ADA</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(parseInt(e.target.value) || 1)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom amount"
                    />
                    <div className="text-sm text-gray-600">
                      = {tokenAmount} ADA
                    </div>
                  </div>
                </div>

                {/* Exchange Rate Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Exchange Rate</h3>
                  <div className="text-sm text-blue-800">
                    <div>• 1 ADA = 1 Token</div>
                    <div>• 1 Token = 1 Storage Request</div>
                    <div>• Verification is always free</div>
                  </div>
                </div>

                {/* Optional Email */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We'll send your API key to this email (not stored on our servers)
                  </p>
                </div>

                {/* Advanced Options */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <div className="mb-2">
                          <strong>Platform Address:</strong>
                          <div className="font-mono text-xs break-all mt-1">
                            {platformAddress}
                          </div>
                        </div>
                        <div>
                          <strong>Network:</strong> {process.env.NEXT_PUBLIC_CARDANO_NETWORK || 'Preview Testnet'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost:</span>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{tokenAmount} ADA</div>
                      <div className="text-sm text-gray-600">{tokenAmount} tokens</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={tokenAmount < 1}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
              <div className="text-center">
                <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Payment</h2>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm text-yellow-800 font-medium">Payment Instructions</p>
                      <p className="text-sm text-yellow-700">
                        Send exactly {tokenAmount} ADA to the platform address below. 
                        After confirmation, you'll be prompted to enter your transaction hash.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="text-left bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <div className="font-semibold">{tokenAmount} ADA</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Tokens:</span>
                        <div className="font-semibold">{tokenAmount} tokens</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Platform Address:</span>
                        <div className="font-mono text-xs break-all mt-1">
                          {platformAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Continue with Payment'
                    )}
                  </button>
                  
                  <button
                    onClick={() => setStep('configure')}
                    disabled={isProcessing}
                    className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Back to Configuration
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && generatedApiKey && (
              <div className="text-center">
                <Key className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">API Key Generated!</h2>
                
                {generatedApiKey.success ? (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Payment Successful</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Transaction Hash: 
                        <span className="font-mono text-xs ml-1">{txHash}</span>
                      </p>
                    </div>

                    {/* API Key Display */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your API Key
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={generatedApiKey.apiKey || ''}
                          readOnly
                          className="w-full px-3 py-3 font-mono text-sm border border-gray-300 rounded-lg bg-gray-50 pr-12"
                        />
                        <button
                          onClick={() => copyToClipboard(generatedApiKey.apiKey || '')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Store this securely - you'll need it to access storage services
                      </p>
                    </div>

                    {/* Purchase Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-gray-900 mb-3">Purchase Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">ADA Paid:</span>
                          <div className="font-semibold">{generatedApiKey.adaAmount} ADA</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Tokens Received:</span>
                          <div className="font-semibold">{generatedApiKey.tokens} tokens</div>
                        </div>
                      </div>
                    </div>

                    {/* Next Steps */}
                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Copy and securely store your API key</li>
                        <li>Install our Google Forms add-on</li>
                        <li>Configure the add-on with your API key</li>
                        <li>Start storing form hashes on the blockchain!</li>
                      </ol>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={() => copyToClipboard(generatedApiKey.apiKey || '')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied!' : 'Copy API Key'}</span>
                      </button>
                      
                      <a
                        href="/docs"
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Documentation</span>
                      </a>
                      
                      <button
                        onClick={() => {
                          setStep('connect');
                          setGeneratedApiKey(null);
                          setTokenAmount(10);
                          setEmail('');
                          setTxHash('');
                          handleWalletDisconnect();
                        }}
                        className="w-full text-gray-500 hover:text-gray-700 font-medium py-2"
                      >
                        Generate Another API Key
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">Generation Failed</span>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                      {generatedApiKey.error || 'Unknown error occurred'}
                    </p>
                    <button
                      onClick={() => setStep('configure')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Need help? Contact us at{' '}
            <a href="mailto:johnndigirigi01@gmail.com" className="text-blue-600 hover:underline">
              johnndigirigi01@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}