'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Wallet, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Info,
  X,
  Shield,
  Zap,
  Database,
  RefreshCw
} from 'lucide-react';
import WalletConnector, { ConnectedWallet } from '@/components/wallet/WalletConnector';
import { paymentUtils, paymentValidation, transactionMetadata } from '@/lib/paymentConfig';
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import { sendApiKeyEmail } from '@/lib/emailService';

interface PaymentDetails {
  adaAmount: number;
  tokenAmount: number;
  email: string;
}

const AccessPage: React.FC = () => {
  const router = useRouter();
  
  // Wallet state
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('0.00 ADA');
  const [networkId, setNetworkId] = useState<number>(0); // Dynamic network ID
  const [networkName, setNetworkName] = useState<string>('Unknown');
  
  // UI state
  const [step, setStep] = useState<'connect' | 'configure' | 'confirm' | 'processing' | 'complete'>('connect');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  
  // Payment state
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    adaAmount: 10,
    tokenAmount: 10,
    email: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Predefined token amounts
  const tokenOptions = [
    { amount: 10, label: 'Starter', description: '10 API calls' },
    { amount: 50, label: 'Basic', description: '50 API calls' },
    { amount: 100, label: 'Professional', description: '100 API calls' },
    { amount: 500, label: 'Business', description: '500 API calls' }
  ];

  // Handle wallet connection with network detection
  const handleWalletConnect = (wallet: ConnectedWallet) => {
    console.log('Wallet connected:', {
      name: wallet.name,
      balance: wallet.balance,
      networkId: wallet.networkId,
      networkName: wallet.networkName
    });
    
    setConnectedWallet(wallet);
    setWalletBalance(wallet.balance);
    setNetworkId(wallet.networkId);
    setNetworkName(wallet.networkName);
    setShowWalletModal(false);
    setWalletError(null);
    setStep('configure');
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = () => {
    setConnectedWallet(null);
    setWalletBalance('0.00 ADA');
    setNetworkId(0);
    setNetworkName('Unknown');
    setStep('connect');
    setPaymentError(null);
    setTransactionHash(null);
    setApiKey(null);
  };

  // Update payment details
  const updatePaymentAmount = (amount: number) => {
    const tokens = paymentValidation.calculateTokens(amount);
    setPaymentDetails(prev => ({
      ...prev,
      adaAmount: amount,
      tokenAmount: tokens
    }));
  };

  // Validate payment readiness
  const canProceedToPayment = (): boolean => {
    if (!connectedWallet) return false;
    if (!paymentValidation.isValidAmount(paymentDetails.adaAmount)) return false;
    if (paymentDetails.email && !paymentValidation.isValidEmail(paymentDetails.email)) return false;
    
    // Check if wallet has sufficient balance
    const balanceStr = walletBalance.replace(' ADA', '');
    const balance = parseFloat(balanceStr);
    return balance >= paymentDetails.adaAmount;
  };

  // Process payment with dynamic network support
  const processPayment = async () => {
    if (!connectedWallet) {
      setPaymentError('Please connect your wallet first');
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);
    setStep('processing');

    try {
      console.log('Processing payment on network:', networkName, 'ID:', networkId);
      
      // Get platform address for the detected network
      const platformAddress = paymentUtils.getPlatformAddress(networkId);
      console.log('Platform address for network:', platformAddress);
      
      // Validate that the platform address matches the network
      if (!paymentUtils.isAddressForNetwork(platformAddress, networkId)) {
        throw new Error(`Platform address doesn't match the connected network (${networkName})`);
      }
      
      // Convert ADA to Lovelace
      const lovelaceAmount = paymentUtils.adaToLovelace(paymentDetails.adaAmount);
      
      // Create transaction metadata with network ID
      const metadata = transactionMetadata.createPaymentMetadata(
        paymentDetails.adaAmount,
        paymentDetails.email || undefined,
        networkId,
        {
          platform: 'NoTamperData',
          purpose: 'API Token Purchase',
          network: networkName
        }
      );
      
      console.log('Transaction metadata:', metadata);
      
      // Build transaction using wallet API
      const tx = await connectedWallet.api.transaction({
        PaymentAddress: platformAddress,
        Amount: lovelaceAmount.toString(),
        Metadata: metadata
      });
      
      // Sign transaction
      const signedTx = await connectedWallet.api.signTx(tx);
      
      // Submit transaction
      const txHash = await connectedWallet.api.submitTx(signedTx);
      
      console.log('Transaction submitted:', txHash);
      setTransactionHash(txHash);
      
      // Wait for transaction confirmation (simplified - in production, use proper confirmation)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create API key after successful payment
      const apiKeyResult = await ApiKeyManager.createApiKey(txHash, paymentDetails.adaAmount);
      
      if (!apiKeyResult.success) {
        throw new Error(apiKeyResult.error || 'Failed to create API key');
      }
      
      setApiKey(apiKeyResult.apiKey!);
      
      // Send email if provided
      if (paymentDetails.email && apiKeyResult.apiKey) {
        try {
          await sendApiKeyEmail(paymentDetails.email, apiKeyResult.apiKey, {
            adaAmount: paymentDetails.adaAmount,
            tokenAmount: paymentDetails.tokenAmount,
            transactionHash: txHash
          });
          console.log('API key sent to email:', paymentDetails.email);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          // Don't fail the transaction if email fails
        }
      }
      
      setStep('complete');
      
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
      setStep('configure');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Get blockchain explorer URL based on network
  const getExplorerUrl = (txHash: string): string => {
    if (networkId === 1) {
      return `https://cardanoscan.io/transaction/${txHash}`;
    }
    return `https://preview.cardanoscan.io/transaction/${txHash}`;
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowWalletModal(false);
    setWalletError(null);
  };

  // Format network display
  const getNetworkBadgeColor = (): string => {
    if (networkId === 1) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4">
        
        {/* Wallet Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
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
                  onConnect={handleWalletConnect}
                  onDisconnect={handleWalletDisconnect}
                  connectedWallet={connectedWallet}
                  isModal={true}
                />
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
              Connect your Cardano wallet, choose your token amount, and get instant access to blockchain-based form verification.
            </p>
            
            {/* Network Badge */}
            {connectedWallet && (
              <div className="mt-4 inline-flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getNetworkBadgeColor()}`}>
                  {networkName}
                </span>
                <span className="text-sm text-gray-600">
                  Network ID: {networkId}
                </span>
              </div>
            )}
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
                    Connect your Cardano wallet to purchase API tokens securely on any network
                  </p>
                  
                  {!connectedWallet ? (
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-2" />
                        <p className="text-green-800 font-medium">Wallet Connected</p>
                        <p className="text-sm text-green-600">{connectedWallet.name}</p>
                        <p className="text-sm text-green-600">Network: {networkName}</p>
                      </div>
                      <button
                        onClick={() => setStep('configure')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Configure Payment */}
              {step === 'configure' && connectedWallet && (
                <div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">Choose Token Amount</h2>
                      <button
                        onClick={() => setShowWalletModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Wallet Info
                      </button>
                    </div>
                    
                    {/* Wallet Balance Display */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Wallet Balance:</span>
                        <span className="font-medium text-gray-900">{walletBalance}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-600">Network:</span>
                        <span className="font-medium text-gray-900">{networkName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Token Options */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {tokenOptions.map((option) => (
                      <button
                        key={option.amount}
                        onClick={() => updatePaymentAmount(option.amount)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          paymentDetails.adaAmount === option.amount
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="font-bold text-lg">{option.amount} ADA</div>
                        <div className="text-sm text-gray-600">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Amount (ADA)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={paymentDetails.adaAmount}
                      onChange={(e) => updatePaymentAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      You will receive {paymentDetails.tokenAmount} tokens (1 ADA = 1 token)
                    </p>
                  </div>

                  {/* Email (Optional) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={paymentDetails.email}
                      onChange={(e) => setPaymentDetails(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      We'll send your API key to this email for safekeeping
                    </p>
                  </div>

                  {/* Payment Error */}
                  {paymentError && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">Payment Error</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">{paymentError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setStep('confirm')}
                      disabled={!canProceedToPayment()}
                      className={`flex-1 px-6 py-3 rounded-md font-medium transition-colors ${
                        canProceedToPayment()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Review Payment
                    </button>
                    <button
                      onClick={handleWalletDisconnect}
                      className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm Payment */}
              {step === 'confirm' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirm Payment</h2>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">Payment Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">{paymentDetails.adaAmount} ADA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tokens:</span>
                        <span className="font-medium">{paymentDetails.tokenAmount} tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Network:</span>
                        <span className="font-medium">{networkName}</span>
                      </div>
                      {paymentDetails.email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{paymentDetails.email}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>{paymentDetails.adaAmount} ADA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Important:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Transaction will be processed on {networkName}</li>
                          <li>API key will be generated after payment confirmation</li>
                          <li>Each token allows 1 hash storage on the blockchain</li>
                          <li>Tokens never expire</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={processPayment}
                      disabled={processingPayment}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
                    >
                      {processingPayment ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay {paymentDetails.adaAmount} ADA
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setStep('configure')}
                      disabled={processingPayment}
                      className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Processing */}
              {step === 'processing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
                  <p className="text-gray-600">Please confirm the transaction in your wallet...</p>
                  <p className="text-sm text-gray-500 mt-2">Network: {networkName}</p>
                </div>
              )}

              {/* Step 5: Complete */}
              {step === 'complete' && apiKey && (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-medium mb-2">Your API Key:</p>
                    <code className="block bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono break-all">
                      {apiKey}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(apiKey)}
                      className="mt-2 text-sm text-green-700 hover:text-green-800"
                    >
                      Copy to Clipboard
                    </button>
                  </div>

                  {transactionHash && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-2">Transaction Hash:</p>
                      <a
                        href={getExplorerUrl(transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-mono break-all"
                      >
                        {transactionHash}
                      </a>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                    >
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full border border-gray-300 px-6 py-3 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Purchase More Tokens
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 text-center">
                <Shield className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Secure Payment</h3>
                <p className="text-sm text-gray-600">
                  Direct blockchain transaction on {networkId === 1 ? 'Cardano Mainnet' : 'Cardano Testnet'}
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 text-center">
                <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Instant Access</h3>
                <p className="text-sm text-gray-600">
                  API key generated immediately after payment confirmation
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 text-center">
                <Database className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Never Expires</h3>
                <p className="text-sm text-gray-600">
                  Your tokens never expire and work on any network
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPage;