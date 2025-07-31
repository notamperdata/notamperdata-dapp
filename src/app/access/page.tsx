// src/app/access/page.tsx 
'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, AlertCircle, Wallet, CreditCard, Key, ExternalLink, X } from 'lucide-react';
import WalletConnector from '@/components/wallet/WalletConnector';
import WalletButton from '@/components/wallet/WalletButton';
import { useWallet, WalletProvider } from '@/hooks/useWallet';
import { PaymentProcessor } from '@/lib/PaymentProccesor';
import { paymentUtils, paymentValidation } from '@/lib/paymentConfig';

interface GeneratedApiKey {
  success: boolean;
  apiKey?: string;
  tokens?: number;
  adaAmount?: number;
  transactionHash?: string;
  error?: string;
  message?: string;
}

function AccessPageContent() {
  // Use global wallet state
  const { connectedWallet, connectWallet, disconnectWallet, error: walletError, clearError } = useWallet();
  
  const [tokenAmount, setTokenAmount] = useState<number>(10);
  const [email, setEmail] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<GeneratedApiKey | null>(null);
  const [step, setStep] = useState<'connect' | 'configure' | 'payment' | 'complete'>('connect');
  const [copied, setCopied] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [paymentProcessor] = useState(() => new PaymentProcessor());
  
  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!connectedWallet) {
      setStep('connect');
      setGeneratedApiKey(null);
    } else {
      // If wallet is connected, move to configure step
      if (step === 'connect') {
        setStep('configure');
      }
    }
  }, [connectedWallet, step]);

  // Clear wallet errors when modal opens
  useEffect(() => {
    if (isModalOpen) {
      clearError();
    }
  }, [isModalOpen, clearError]);

  const platformAddress = paymentUtils.getPlatformAddress();

  const handleWalletConnect = async (walletKey: string) => {
    try {
      await connectWallet(walletKey);
      setIsModalOpen(false); // Close modal when wallet connects
    } catch (error) {
      // Error is handled by the wallet hook
      console.error('Wallet connection failed:', error);
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setStep('connect');
    setGeneratedApiKey(null);
  };

  const handleStartConfiguration = () => {
    setStep('configure');
  };

  const handleProceedToPayment = () => {
    if (!paymentValidation.isValidAmount(tokenAmount)) {
      alert(`Amount must be between ${paymentValidation.calculateTokens(1)} and ${paymentValidation.calculateTokens(1000)} tokens`);
      return;
    }
    setStep('payment');
  };

  const handleSendPayment = async () => {
    if (!connectedWallet) {
      alert('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    try {
      // Process payment using the correct PaymentRequest interface
      const result = await paymentProcessor.processPayment({
        walletApi: connectedWallet.api,
        amount: tokenAmount,
        platformAddress: platformAddress,
        email: email,
        metadata: {
          purpose: 'NoTamperData API Token Purchase',
          tokensPurchased: paymentValidation.calculateTokens(tokenAmount)
        }
      });

      console.log('Payment result:', result);
      
      // Check if payment was successful and extract transaction hash
      if (result.success && result.transactionHash) {
        console.log('Payment successful, transaction hash:', result.transactionHash);
        
        // Generate API key using the transaction hash
        const apiKeyResult = await generateApiKey(result.transactionHash);
        
        if (apiKeyResult.success) {
          setGeneratedApiKey(apiKeyResult);
          setStep('complete');
        } else {
          alert(`API key generation failed: ${apiKeyResult.error}`);
        }
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateApiKey = async (transactionHash: string): Promise<GeneratedApiKey> => {
    try {
      const response = await fetch('/api/generate-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: transactionHash,
          email,
          tokenAmount,
          walletAddress: connectedWallet?.address
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API key generation error:', error);
      return {
        success: false,
        error: 'Failed to generate API key'
      };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // FIXED: Modal toggle handler with proper useCallback (removed isModalOpen dependency)
  const handleModalToggle = React.useCallback(() => {
    console.log('Modal toggle clicked');
    setIsModalOpen(prev => {
      const newState = !prev;
      console.log('Setting modal state to:', newState);
      return newState;
    });
  }, []); // Empty dependency array - this is the key fix

  const handleModalClose = React.useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Closing modal');
    setIsModalOpen(false);
  }, []);

  const handleModalContentClick = React.useCallback((e: React.MouseEvent) => {
    // Prevent modal from closing when clicking inside
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Add effect to debug modal state changes
  useEffect(() => {
    console.log('Modal state changed:', isModalOpen);
  }, [isModalOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Wallet Button Section - Top Right Below Navigation */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end py-4">
            <WalletButton
              connectedWallet={connectedWallet}
              onToggleModal={handleModalToggle}
              onDisconnect={handleWalletDisconnect}
            />
          </div>
        </div>
      </div>

      {/* Modal - Fixed click handling with improved state management */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={handleModalClose}
        >
          <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop - Click to close */}
            <div 
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Modal Content - Prevent auto-close */}
            <div 
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              onClick={handleModalContentClick}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 id="modal-title" className="text-lg font-medium text-gray-900">
                    {connectedWallet ? 'Wallet Information' : 'Connect Wallet'}
                  </h3>
                  <button
                    onClick={handleModalClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    type="button"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Show wallet error if exists */}
                {walletError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Connection Error</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{walletError}</p>
                  </div>
                )}
                
                <WalletConnector
                  onConnect={(wallet) => handleWalletConnect(wallet.name)}
                  onDisconnect={handleWalletDisconnect}
                  connectedWallet={connectedWallet}
                  isModal={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Access NoTamperData API
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Connect your Cardano wallet, 
            choose your token amount, and get instant access to blockchain-based form verification.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200/50 p-6">
            
            {/* Step 1: Connect Wallet */}
            {step === 'connect' && (
              <div className="text-center">
                <Wallet className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Cardano Wallet</h2>
                <p className="text-gray-700 mb-8">
                  Connect your Cardano wallet to purchase API tokens securely
                </p>
                
                {!connectedWallet ? (
                  <div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      Connect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-medium text-green-900">
                            Connected to {connectedWallet.name}
                          </h3>
                          <p className="text-sm text-green-700">
                            Ready to proceed with token purchase
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleStartConfiguration}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      Continue to Configuration
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Configure Purchase */}
            {step === 'configure' && (
              <div className="space-y-6">
                <div className="text-center">
                  <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Configure Your Purchase</h2>
                  <p className="text-gray-700">
                    Choose how many API tokens you'd like to purchase
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Token Amount Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of API Tokens
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="number"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                        min="1"
                        max="1000"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        ≈ {paymentValidation.calculateTokens(tokenAmount)} ADA
                      </span>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address (for API key delivery)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Advanced Options */}
                  <div>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </button>
                    
                    {showAdvanced && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">
                          <p><strong>Platform Address:</strong> {platformAddress}</p>
                          <p><strong>Network:</strong> {process.env.NEXT_PUBLIC_CARDANO_NETWORK}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep('connect')}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProceedToPayment}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    disabled={!email || tokenAmount <= 0}
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Key className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Payment</h2>
                  <p className="text-gray-700">
                    Review your purchase and send payment
                  </p>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>API Tokens:</span>
                      <span>{tokenAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price per Token:</span>
                      <span>{paymentValidation.calculateTokens(1)} ADA</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{paymentValidation.calculateTokens(tokenAmount)} ADA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span>{email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep('configure')}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
                    disabled={isProcessing}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSendPayment}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Send Payment'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && generatedApiKey && (
              <div className="space-y-6">
                <div className="text-center">
                  <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Complete!</h2>
                  <p className="text-gray-700">
                    Here's your API key:
                  </p>
                </div>

                <div className="space-y-6">
                  {/* API Key Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-800">Your API Key</label>
                      <button
                        onClick={() => copyToClipboard(generatedApiKey.apiKey || '')}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="bg-white border border-gray-300 rounded p-3 font-mono text-sm text-gray-900 break-all">
                      {generatedApiKey.apiKey}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">Transaction Complete</h3>
                    <div className="text-sm text-green-800 space-y-1">
                      <div>Tokens: {generatedApiKey.tokens}</div>
                      <div>ADA Paid: {generatedApiKey.adaAmount}</div>
                      {generatedApiKey.transactionHash && (
                        <div className="break-all">
                          TX: {generatedApiKey.transactionHash}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Next Steps */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Save your API key securely</li>
                      <li>Check your email for the API key backup</li>
                      <li>Visit our <a href="/docs" className="underline">documentation</a> to get started</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessPage() {
  return (
    <WalletProvider>
      <AccessPageContent />
    </WalletProvider>
  );
}