/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Wallet, 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Info,
  X,
  RefreshCw,
  Copy,
  Trash2,
  Key,
  Clock,
  Zap
} from 'lucide-react';

// Define a simplified wallet interface for this component
interface WalletInfo {
  name: string;
  address: string;
  balance: string;
  networkId: number;
  networkName: string;
  wallet: any; // Keep as any to avoid import issues during SSR
}

interface PaymentDetails {
  adaAmount: number;
  tokenAmount: number;
  email: string;
}

interface StoredToken {
  token: string;
  adaAmount: number;
  tokenAmount: number;
  createdAt: string;
  networkId: number;
  networkName: string;
}

// Create the main component that will be dynamically imported
const AccessPageComponent: React.FC = () => {
  
  // Wallet state
  const [connectedWallet, setConnectedWallet] = useState<WalletInfo | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Array<{ name: string; icon: string; version: string }>>([]);
  const [walletBalance, setWalletBalance] = useState<string>('0.00 ADA');
  const [networkId, setNetworkId] = useState<number>(0);
  const [networkName, setNetworkName] = useState<string>('Unknown');
  
  // UI state
  const [step, setStep] = useState<'connect' | 'configure' | 'confirm' | 'processing' | 'complete'>('connect');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Payment state
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    adaAmount: 10,
    tokenAmount: 10,
    email: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Local storage and toast state
  const [storedTokens, setStoredTokens] = useState<StoredToken[]>([]);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Predefined token amounts
  const tokenOptions = [
    { amount: 10, label: 'Starter', description: '10 API calls' },
    { amount: 50, label: 'Basic', description: '50 API calls' },
    { amount: 100, label: 'Professional', description: '100 API calls' },
    { amount: 500, label: 'Business', description: '500 API calls' }
  ];

  // Load stored tokens from localStorage on component mount
  useEffect(() => {
    loadStoredTokens();
  }, []);

  // Load stored tokens from localStorage
  const loadStoredTokens = () => {
    try {
      const stored = localStorage.getItem('notamperdata_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        setStoredTokens(Array.isArray(tokens) ? tokens : []);
      }
    } catch (error) {
      console.error('Error loading stored tokens:', error);
    }
  };

  // Save token to localStorage
  const saveTokenToStorage = (token: string, adaAmount: number, tokenAmount: number, networkId: number, networkName: string) => {
    try {
      const newToken: StoredToken = {
        token,
        adaAmount,
        tokenAmount,
        createdAt: new Date().toISOString(),
        networkId,
        networkName
      };
      
      const updatedTokens = [...storedTokens, newToken];
      localStorage.setItem('notamperdata_tokens', JSON.stringify(updatedTokens));
      setStoredTokens(updatedTokens);
      
      showToastMessage('Token saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving token:', error);
      showToastMessage('Failed to save token', 'error');
    }
  };

  // Clear a specific token from storage
  const clearTokenFromStorage = (tokenToRemove: string) => {
    try {
      const updatedTokens = storedTokens.filter(t => t.token !== tokenToRemove);
      localStorage.setItem('notamperdata_tokens', JSON.stringify(updatedTokens));
      setStoredTokens(updatedTokens);
      showToastMessage('Token removed successfully!', 'success');
    } catch (error) {
      console.error('Error removing token:', error);
      showToastMessage('Failed to remove token', 'error');
    }
  };

  // Clear all tokens from storage
  const clearAllTokens = () => {
    try {
      localStorage.removeItem('notamperdata_tokens');
      setStoredTokens([]);
      showToastMessage('All tokens cleared!', 'success');
    } catch (error) {
      console.error('Error clearing tokens:', error);
      showToastMessage('Failed to clear tokens', 'error');
    }
  };

  // Copy token to clipboard
  const copyTokenToClipboard = (token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      showToastMessage('Token copied to clipboard!', 'success');
    }).catch(() => {
      showToastMessage('Failed to copy token', 'error');
    });
  };

  // Show toast message
  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // Load available wallets on component mount - using dynamic imports
  useEffect(() => {
    const loadWallets = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const { BrowserWallet } = await import('@meshsdk/core');
        const wallets = await BrowserWallet.getAvailableWallets();
        setAvailableWallets(wallets);
        console.log('Available wallets:', wallets);
      } catch (error) {
        console.error('Error loading wallets:', error);
        setWalletError('Failed to load available wallets');
      }
    };

    // Only load wallets on client side
    if (typeof window !== 'undefined') {
      loadWallets();
    }
  }, []);

  // Get network info from network ID
  const getNetworkFromId = (networkId: number): { name: string; isMainnet: boolean } => {
    if (networkId === 1) {
      return { name: 'Mainnet', isMainnet: true };
    }
    return { name: 'Preview Testnet', isMainnet: false };
  };

  // Connect to wallet - using dynamic imports
  const connectWallet = async (walletName: string) => {
    setIsConnecting(true);
    setWalletError(null);

    try {
      console.log(`Connecting to wallet: ${walletName}`);
      
      // Dynamic import to avoid SSR issues
      const { BrowserWallet } = await import('@meshsdk/core');
      
      // Enable the wallet using MeshSDK
      const wallet = await BrowserWallet.enable(walletName);
      
      // Get addresses
      const usedAddresses = await wallet.getUsedAddresses();
      const unusedAddresses = await wallet.getUnusedAddresses();
      const changeAddress = await wallet.getChangeAddress();
      
      // Use first used address, or unused, or change address
      const firstAddress = usedAddresses[0] || unusedAddresses[0] || changeAddress;
      
      if (!firstAddress) {
        throw new Error('No addresses found in wallet');
      }
      
      // Get network ID
      const networkId = await wallet.getNetworkId();
      const networkInfo = getNetworkFromId(networkId);
      
      // Get balance
      let lovelace = "0";
      try {
        lovelace = await wallet.getLovelace();
      } catch (error) {
        console.log('getLovelace failed, trying getBalance:', error);
        try {
          const balance = await wallet.getBalance();
          const lovelaceAsset = balance.find((asset: { unit: string; quantity: string }) => asset.unit === 'lovelace');
          if (lovelaceAsset) {
            lovelace = lovelaceAsset.quantity;
          }
        } catch (balanceError) {
          console.error('Error getting balance:', balanceError);
        }
      }
      
      const adaBalance = (parseInt(lovelace || "0") / 1000000).toFixed(2);
      
      const walletInfo: WalletInfo = {
        name: walletName,
        address: firstAddress,
        balance: `${adaBalance} ADA`,
        networkId,
        networkName: networkInfo.name,
        wallet
      };
      
      setConnectedWallet(walletInfo);
      setWalletBalance(walletInfo.balance);
      setNetworkId(networkId);
      setNetworkName(networkInfo.name);
      setShowWalletModal(false);
      setStep('configure');
      
      console.log('Wallet connected successfully:', walletInfo);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      let errorMessage = 'Failed to connect to wallet';
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
          errorMessage = 'Connection cancelled by user';
        } else if (error.message.includes('network')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Failed to connect: ${error.message}`;
        }
      }
      
      setWalletError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
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
    setAccessToken(null);
  };

  // Update payment details - using dynamic imports for validation
  const updatePaymentAmount = async (amount: number) => {
    try {
      // Dynamic import for payment validation
      const { paymentValidation } = await import('@/lib/paymentConfig');
      const tokens = paymentValidation.calculateTokens(amount);
      setPaymentDetails(prev => ({
        ...prev,
        adaAmount: amount,
        tokenAmount: tokens
      }));
    } catch (error) {
      console.log(error)
      // Fallback calculation if import fails
      setPaymentDetails(prev => ({
        ...prev,
        adaAmount: amount,
        tokenAmount: amount // 1:1 ratio as fallback
      }));
    }
  };

  // Sync version for immediate UI feedback
  const canProceedToPaymentSync = (): boolean => {
    if (!connectedWallet) return false;
    const balanceStr = walletBalance.replace(' ADA', '');
    const balance = parseFloat(balanceStr);
    return balance >= paymentDetails.adaAmount && paymentDetails.adaAmount > 0;
  };

  // Process payment with dynamic network support - using dynamic imports
  const processPayment = async () => {
    if (!connectedWallet || !connectedWallet.wallet) {
      setPaymentError('Please connect your wallet first');
      return;
    }

    setProcessingPayment(true);
    setPaymentError(null);
    setStep('processing');

    try {
      console.log('Processing payment on network:', networkName, 'ID:', networkId);
      
      // Dynamic imports for payment processing
      const { paymentUtils, transactionMetadata } = await import('@/lib/paymentConfig');
      
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
      
      // Build transaction using MeshJS Transaction builder - dynamic import
      const { Transaction } = await import('@meshsdk/core');
      const tx = new Transaction({ initiator: connectedWallet.wallet });
      
      // Add payment output
      tx.sendLovelace(platformAddress, lovelaceAmount.toString());
      
      // Add metadata if provided
      if (metadata) {
        tx.setMetadata(674, metadata); // Using label 674 for general metadata
      }
      
      // Build the transaction
      const unsignedTx = await tx.build();
      
      // Sign transaction
      const signedTx = await connectedWallet.wallet.signTx(unsignedTx, true);
      
      // Submit transaction
      const txHash = await connectedWallet.wallet.submitTx(signedTx);
      
      console.log('Transaction submitted:', txHash);
      setTransactionHash(txHash);
      
      // Wait for transaction confirmation (simplified - in production, use proper confirmation)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Create access token by calling the API endpoint
      const accessTokenResponse = await fetch('/api/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash,
          adaAmount: paymentDetails.adaAmount,
          tokenAmount: paymentDetails.tokenAmount,
          email: paymentDetails.email || undefined,
          networkId
        })
      });

      if (!accessTokenResponse.ok) {
        const errorData = await accessTokenResponse.json();
        throw new Error(errorData.error || 'Failed to create access token');
      }

      const accessTokenData = await accessTokenResponse.json();
      
      if (!accessTokenData.success || !accessTokenData.accessToken) {
        throw new Error('Failed to generate access token');
      }
      
      setAccessToken(accessTokenData.accessToken);
      
      // Save token to localStorage automatically
      saveTokenToStorage(
        accessTokenData.accessToken,
        paymentDetails.adaAmount,
        paymentDetails.tokenAmount,
        networkId,
        networkName
      );
      
      // Email notification is handled by the API endpoint
      if (paymentDetails.email && accessTokenData.emailSent) {
        console.log('access token sent to email:', paymentDetails.email);
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
    if (networkId === 1) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    return 'bg-blue-100 text-blue-800 border border-blue-200';
  };

  // Format date for display
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 animate-in fade-in duration-300">
            <div className={`rounded-lg p-4 shadow-lg border ${
              showToast.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center space-x-2">
                {showToast.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span className="font-medium">{showToast.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-gray-200">
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {connectedWallet ? 'Wallet Information' : 'Connect Wallet'}
                  </h3>
                  <button
                    onClick={handleModalClose}
                    className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    type="button"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Show wallet error if exists */}
                {walletError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-semibold text-red-800">Connection Error</span>
                    </div>
                    <p className="text-sm text-red-700 mt-2">{walletError}</p>
                  </div>
                )}
                
                {/* Wallet Connection Content */}
                {connectedWallet ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-emerald-800 font-semibold text-center text-lg">Wallet Connected</p>
                      <div className="mt-3 space-y-1">
                        <p className="text-sm text-emerald-700 text-center">
                          <span className="font-medium">Wallet:</span> {connectedWallet.name}
                        </p>
                        <p className="text-sm text-emerald-700 text-center">
                          <span className="font-medium">Network:</span> {networkName}
                        </p>
                        <p className="text-sm text-emerald-700 text-center">
                          <span className="font-medium">Balance:</span> {walletBalance}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleWalletDisconnect}
                      className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableWallets.length > 0 ? (
                      <div className="space-y-3">
                        {availableWallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={() => connectWallet(wallet.name)}
                            disabled={isConnecting}
                            className="w-full flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-white font-bold text-lg">
                                {wallet.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-semibold text-gray-900">{wallet.name}</p>
                              <p className="text-sm text-gray-600">Version {wallet.version}</p>
                            </div>
                            {isConnecting && (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-700 mb-4 font-medium">No Cardano wallets detected</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-left">
                          <h4 className="font-semibold text-blue-900 mb-3">How to Install a Wallet</h4>
                          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                            <li>Visit a wallet website (e.g., namiwallet.io, eternl.io)</li>
                            <li>Download the browser extension</li>
                            <li>Create or restore your wallet</li>
                            <li>Refresh this page to detect the wallet</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Connect your Cardano wallet, choose your token amount, and get instant access to blockchain-based form verification.
            </p>
            
            {/* Network Badge */}
            {connectedWallet && (
              <div className="mt-6 inline-flex items-center space-x-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getNetworkBadgeColor()}`}>
                  {networkName}
                </span>
                <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200">
                  Network ID: {networkId}
                </span>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              
              {/* Step 1: Connect Wallet */}
              {step === 'connect' && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-10 h-10 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Cardano Wallet</h2>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Connect your Cardano wallet to purchase API tokens securely on any network
                  </p>
                  
                  {!connectedWallet ? (
                    <button
                      onClick={() => setShowWalletModal(true)}
                      className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-md"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                        <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                        <p className="text-emerald-800 font-semibold text-lg">Wallet Connected</p>
                        <p className="text-emerald-700 mt-1">{connectedWallet.name}</p>
                        <p className="text-emerald-700">Network: {networkName}</p>
                      </div>
                      <button
                        onClick={() => setStep('configure')}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Choose Token Amount</h2>
                      <button
                        onClick={() => setShowWalletModal(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Wallet Info
                      </button>
                    </div>
                    
                    {/* Wallet Balance Display */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Wallet Balance:</span>
                        <span className="font-bold text-gray-900 text-lg">{walletBalance}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-gray-700 font-medium">Network:</span>
                        <span className="font-bold text-gray-900">{networkName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Token Options */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {tokenOptions.map((option) => (
                      <button
                        key={option.amount}
                        onClick={() => updatePaymentAmount(option.amount)}
                        className={`p-5 rounded-lg border-2 transition-all ${
                          paymentDetails.adaAmount === option.amount
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                        }`}
                      >
                        <div className="font-bold text-xl text-gray-900">{option.amount} ADA</div>
                        <div className="text-sm text-blue-600 font-medium mt-1">{option.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Custom Amount (ADA)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={paymentDetails.adaAmount}
                      onChange={(e) => updatePaymentAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      You will receive <span className="font-semibold">{paymentDetails.tokenAmount} tokens</span> (1 ADA = 1 token)
                    </p>
                  </div>

                  {/* Payment Error */}
                  {paymentError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Payment Error</span>
                      </div>
                      <p className="text-sm text-red-700 mt-2">{paymentError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setStep('confirm')}
                      disabled={!canProceedToPaymentSync()}
                      className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-colors ${
                        canProceedToPaymentSync()
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Review Payment
                    </button>
                    <button
                      onClick={handleWalletDisconnect}
                      className="px-6 py-4 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm Payment */}
              {step === 'confirm' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">Confirm Payment</h2>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">Payment Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Amount:</span>
                        <span className="font-bold text-gray-900 text-lg">{paymentDetails.adaAmount} ADA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Tokens:</span>
                        <span className="font-bold text-gray-900">{paymentDetails.tokenAmount} tokens</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">Network:</span>
                        <span className="font-bold text-gray-900">{networkName}</span>
                      </div>
                      {paymentDetails.email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Email:</span>
                          <span className="font-bold text-gray-900">{paymentDetails.email}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-900 font-bold text-lg">Total:</span>
                          <span className="text-gray-900 font-bold text-xl">{paymentDetails.adaAmount} ADA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
                    <div className="flex items-start space-x-3">
                      <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-2">Important Information:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Transaction will be processed on {networkName}</li>
                          <li>Access token will be generated after payment confirmation</li>
                          <li>Each token allows 1 hash storage on the blockchain</li>
                          <li>Tokens have no expiry</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={processPayment}
                      disabled={processingPayment}
                      className="flex-1 bg-emerald-600 text-white px-6 py-4 rounded-lg hover:bg-emerald-700 transition-colors font-semibold flex items-center justify-center shadow-md"
                    >
                      {processingPayment ? (
                        <>
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pay {paymentDetails.adaAmount} ADA
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setStep('configure')}
                      disabled={processingPayment}
                      className="px-6 py-4 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Processing */}
              {step === 'processing' && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Processing Payment</h2>
                  <p className="text-gray-700 text-lg">Please confirm the transaction in your wallet...</p>
                  <p className="text-sm text-gray-600 mt-3 bg-gray-100 px-4 py-2 rounded-lg inline-block">
                    Network: {networkName}
                  </p>
                </div>
              )}

              {/* Step 5: Complete */}
              {step === 'complete' && accessToken && (
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Successful!</h2>
                  
                  {/* Token Information Card */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 text-left">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-emerald-800 font-semibold text-lg flex items-center">
                        <Key className="w-5 h-5 mr-2" />
                        Your Access Token
                      </p>
                      <button
                        onClick={() => copyTokenToClipboard(accessToken)}
                        className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-medium bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </button>
                    </div>
                    
                    <code className="block bg-white px-4 py-3 rounded-lg border border-emerald-300 text-sm font-mono break-all text-gray-800 shadow-inner mb-4">
                      {accessToken}
                    </code>
                    
                    {/* Token Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <div className="flex items-center text-emerald-700 mb-1">
                          <Zap className="w-4 h-4 mr-1" />
                          <span className="font-medium">Tokens Purchased</span>
                        </div>
                        <div className="text-emerald-900 font-bold text-lg">{paymentDetails.tokenAmount}</div>
                        <div className="text-emerald-600 text-xs">API calls available</div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 border border-emerald-200">
                        <div className="flex items-center text-emerald-700 mb-1">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-medium">Valid Until</span>
                        </div>
                        <div className="text-emerald-900 font-bold">No expiry</div>
                        <div className="text-emerald-600 text-xs">Use anytime</div>
                      </div>
                    </div>
                    
            
                  </div>

                  {/* Transaction Information */}
                  {transactionHash && (
                    <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 font-medium mb-2">Transaction Details:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Network:</span>
                          <span className="font-medium text-gray-900">{networkName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Amount Paid:</span>
                          <span className="font-medium text-gray-900">{paymentDetails.adaAmount} ADA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Transaction Hash:</span>
                          <a
                            href={getExplorerUrl(transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-mono text-xs break-all max-w-[200px] truncate"
                          >
                            {transactionHash.substring(0, 16)}...
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setStep('connect');
                        setAccessToken(null);
                        setTransactionHash(null);
                        handleWalletDisconnect();
                      }}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Purchase More Tokens
                    </button>
                    {transactionHash && (
                      <a
                        href={getExplorerUrl(transactionHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                      >
                        View Transaction
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stored Tokens Management Section */}
        {storedTokens.length > 0 && (
          <div className="py-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Key className="w-6 h-6 mr-2 text-blue-600" />
                    Your Access Tokens
                  </h3>
                  <button
                    onClick={clearAllTokens}
                    className="text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {storedTokens.map((storedToken, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <code className="bg-white px-3 py-1 rounded border text-sm text-black font-mono">
                              {storedToken.token.substring(0,3)}...{storedToken.token.substring(storedToken.token.length-5)}
                            </code>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              storedToken.networkId === 1 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {storedToken.networkName}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>{storedToken.tokenAmount} tokens</div>
                            <div>Created: {formatDate(storedToken.createdAt)}</div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyTokenToClipboard(storedToken.token)}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copy token"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => clearTokenFromStorage(storedToken.token)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove token"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

// Export with dynamic import to disable SSR
const AccessPage = dynamic(() => Promise.resolve(AccessPageComponent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading wallet interface...</p>
      </div>
    </div>
  )
});

export default AccessPage;