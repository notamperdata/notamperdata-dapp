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

  const handlePayment = async () => {
    if (!connectedWallet) {
      alert('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Process payment using the PaymentProcessor
      const result = await paymentProcessor.processPayment({
        walletApi: connectedWallet.api,
        amount: tokenAmount,
        platformAddress: platformAddress,
        email: email,
        metadata: {
          referenceId: paymentUtils.generateTransactionRef(),
          tokensPurchased: paymentValidation.calculateTokens(tokenAmount)
        }
      });

      if (result.success && result.transactionHash) {
        // Generate API key after successful payment
        const apiKeyResult = await generateApiKey(result.transactionHash);
        setGeneratedApiKey(apiKeyResult);
        setStep('complete');
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Wallet Button Section - Top Right Below Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end py-4">
            <WalletButton
              connectedWallet={connectedWallet}
              onToggleModal={() => setIsModalOpen(!isModalOpen)}
              onDisconnect={handleWalletDisconnect}
            />
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            ></div>

            {/* Modal Content */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {connectedWallet ? 'Wallet Information' : 'Connect Wallet'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
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
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect your Cardano wallet, 
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
                
                {!connectedWallet ? (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Start Connection
                  </button>
                ) : (
                  <button
                    onClick={handleStartConfiguration}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Continue to Configuration
                  </button>
                )}
              </div>
            )}

            {/* Step 2: Configure Purchase */}
            {step === 'configure' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configure Your Purchase</h2>
                
                {/* Connected Wallet Info */}
                {connectedWallet && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        Connected to {connectedWallet.name}
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Address: {connectedWallet.address?.substring(0, 20)}...
                    </p>
                    {connectedWallet.balance && (
                      <p className="text-sm text-green-700">
                        Balance: {connectedWallet.balance}
                      </p>
                    )}
                  </div>
                )}

                {/* Token Amount Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Tokens (1 ADA = 1 Token)
                  </label>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[5, 10, 25, 50].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setTokenAmount(amount)}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          tokenAmount === amount
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold">{amount}</div>
                        <div className="text-xs text-gray-500">{paymentUtils.formatAda(amount)}</div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(parseInt(e.target.value) || 1)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Custom amount"
                    />
                    <span className="text-sm text-gray-500">tokens</span>
                  </div>
                </div>

                {/* Email Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Receive API key and usage notifications
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Purchase Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Tokens:</span>
                      <span>{paymentValidation.calculateTokens(tokenAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost:</span>
                      <span>{paymentUtils.formatAda(tokenAmount)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{paymentUtils.formatAda(paymentValidation.calculateTotalCost(tokenAmount))}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Payment</h2>
                
                <div className="text-center mb-6">
                  <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Click the button below to send {paymentUtils.formatAda(tokenAmount)} to complete your purchase.
                    Your wallet will prompt you to confirm the transaction.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="text-left bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <div className="font-semibold">{paymentUtils.formatAda(tokenAmount)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Tokens:</span>
                        <div className="font-semibold">{paymentValidation.calculateTokens(tokenAmount)} tokens</div>
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
                        <span>Processing Payment...</span>
                      </div>
                    ) : (
                      'Send Payment'
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
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 mb-2">Payment successful!</p>
                      <p className="text-sm text-green-700">
                        Transaction: {generatedApiKey.transactionHash?.substring(0, 20)}...
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your API Key
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={generatedApiKey.apiKey || ''}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(generatedApiKey.apiKey || '')}
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span className="text-sm">{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-medium text-blue-900 mb-2">Important Notes:</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Store your API key securely</li>
                        <li>• You have {generatedApiKey.tokens} verification tokens</li>
                        <li>• Each form verification uses 1 token</li>
                        <li>• Check our documentation for integration guides</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <a
                        href="/docs"
                        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-center"
                      >
                        View Documentation
                      </a>
                      <button
                        onClick={() => {
                          setStep('connect');
                          setGeneratedApiKey(null);
                          setTokenAmount(10);
                          setEmail('');
                        }}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Purchase More Tokens
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-800">API Key Generation Failed</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        {generatedApiKey.error || 'Unknown error occurred'}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setStep('payment')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component wrapped with WalletProvider
export default function AccessPage() {
  return (
    <WalletProvider>
      <AccessPageContent />
    </WalletProvider>
  );
}