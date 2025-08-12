// src/components/wallet/WalletConnector.tsx 
'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface WalletInfo {
  name: string;
  icon: string;
  version: string;
  apiVersion?: string;
}

interface ConnectedWallet {
  name: string;
  api: any;
  address: string;
  balance?: string;
  networkId?: number;
}

interface WalletConnectorProps {
  onConnect: (wallet: ConnectedWallet) => void;
  onDisconnect: () => void;
  connectedWallet: ConnectedWallet | null;
  isModal?: boolean; // New prop for modal styling
}

export default function WalletConnector({ onConnect, onDisconnect, connectedWallet, isModal = false }: WalletConnectorProps) {
  const [availableWallets, setAvailableWallets] = useState<Array<{
    key: string;
    info: WalletInfo;
  }>>([]);
  
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<string>('');

  // Detect available wallets from window.cardano
  const detectWallets = async () => {
    setIsRefreshing(true);
    const detected: Array<{ key: string; info: WalletInfo }> = [];

    try {
      if (typeof window !== 'undefined' && (window as any).cardano) {
        const cardano = (window as any).cardano;
        
        // Iterate through all available wallet properties
        for (const walletKey of Object.keys(cardano)) {
          try {
            const wallet = cardano[walletKey];
            
            // Skip if not a wallet object or doesn't have required properties
            if (!wallet || typeof wallet !== 'object') continue;
            if (!wallet.name && !wallet.icon) continue;
            
            // Get wallet info
            const walletInfo: WalletInfo = {
              name: wallet.name || walletKey,
              icon: wallet.icon || '',
              version: wallet.version || '1.0.0',
              apiVersion: wallet.apiVersion || wallet.api?.version || '1.0.0'
            };

            detected.push({
              key: walletKey,
              info: walletInfo
            });
          } catch (walletError) {
            console.warn(`Error checking wallet ${walletKey}:`, walletError);
          }
        }
      }
    } catch (error) {
      console.error('Error detecting wallets:', error);
      setError('Failed to detect available wallets');
    }

    setAvailableWallets(detected);
    setIsRefreshing(false);
  };

  // Update wallet balance periodically - FIXED VERSION
  const updateWalletBalance = async () => {
    if (!connectedWallet?.api) return;

    try {
      const rawBalance = await connectedWallet.api.getBalance();
      console.log('Raw balance from wallet:', rawBalance, 'Type:', typeof rawBalance);
      
      // FIXED: Handle different balance formats that wallets might return
      let balance: string;
      if (typeof rawBalance === 'string') {
        balance = rawBalance;
      } else if (typeof rawBalance === 'object' && rawBalance !== null) {
        // Some wallets return balance as an object with lovelace property
        const balanceObj = rawBalance as any;
        balance = balanceObj.lovelace || balanceObj.ada || balanceObj.coin || String(rawBalance) || '0';
      } else if (Array.isArray(rawBalance) && rawBalance.length > 0) {
        // Some wallets return an array of UTXOs
        const utxo = rawBalance[0] as any;
        balance = utxo?.amount || utxo?.value || '0';
      } else {
        balance = String(rawBalance || '0');
      }
      
      // FIXED: Better parsing of lovelace amount
      const lovelaceAmount = parseInt(String(balance)) || 0;
      const adaBalance = (lovelaceAmount / 1000000).toFixed(2);
      setWalletBalance(`${adaBalance} ADA`);
    } catch (error) {
      console.warn('Failed to update wallet balance:', error);
    }
  };

  // Load wallets on component mount
  useEffect(() => {
    detectWallets();
  }, []);

  // Update balance when wallet is connected
  useEffect(() => {
    if (connectedWallet) {
      updateWalletBalance();
      // Set up interval to update balance periodically
      const interval = setInterval(updateWalletBalance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [connectedWallet]);

  const connectWallet = async (walletKey: string, walletInfo: WalletInfo) => {
    setIsConnecting(walletKey);
    setError(null);

    try {
      const cardanoWallet = (window as any).cardano?.[walletKey];
      
      if (!cardanoWallet) {
        throw new Error(`${walletInfo.name} wallet not found`);
      }

      // Enable the wallet
      const api = await cardanoWallet.enable();
      
      // Get wallet details
      const networkId = await api.getNetworkId();
      const address = await api.getChangeAddress();
      
      // FIXED: Better balance handling with multiple fallback strategies
      let balance: string;
      try {
        const rawBalance = await api.getBalance();
        console.log('Raw balance from wallet:', rawBalance, 'Type:', typeof rawBalance);
        
        // Handle different balance formats that different wallets might return
        if (typeof rawBalance === 'string') {
          balance = rawBalance;
        } else if (typeof rawBalance === 'object' && rawBalance !== null) {
          // Try different possible properties
          const balanceObj = rawBalance as any;
          balance = balanceObj.lovelace || balanceObj.ada || balanceObj.coin || '0';
        } else if (Array.isArray(rawBalance)) {
          // Some wallets might return UTXO array
          const totalLovelace = rawBalance.reduce((sum: number, utxo: any) => {
            const amount = utxo.amount || utxo.value || 0;
            return sum + (typeof amount === 'string' ? parseInt(amount) : Number(amount));
          }, 0);
          balance = totalLovelace.toString();
        } else {
          balance = String(rawBalance || '0');
        }
      } catch (balanceError) {
        console.warn('Failed to get balance, using 0:', balanceError);
        balance = '0';
      }

      // Validate network - FIXED: Use consistent environment variable name
      const expectedNetwork = process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0;
      if (networkId !== expectedNetwork) {
        const networkName = expectedNetwork === 1 ? 'Mainnet' : 'Preview Testnet';
        throw new Error(`Please switch your wallet to ${networkName}`);
      }

      // Convert balance from lovelace to ADA - 
      let adaBalance: string;
      try {
        const lovelaceAmount = parseInt(String(balance)) || 0;
        adaBalance = (lovelaceAmount / 1000000).toFixed(2);
      } catch (conversionError) {
        console.warn('Balance conversion failed, using 0:', conversionError);
        adaBalance = '0.00';
      }

      const connectedWalletData: ConnectedWallet = {
        name: walletInfo.name,
        api,
        address: address || 'Unknown address',
        balance: `${adaBalance} ADA`,
        networkId
      };

      console.log('Wallet connected successfully:', {
        name: walletInfo.name,
        address: address?.substring(0, 20) + '...',
        balance: `${adaBalance} ADA`,
        networkId
      });

      setWalletBalance(`${adaBalance} ADA`);
      onConnect(connectedWalletData);

    } catch (error) {
      console.error(`Failed to connect to ${walletInfo.name}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          setError('Connection was cancelled by user');
        } else if (error.message.includes('network') || error.message.includes('switch')) {
          setError(error.message);
        } else {
          setError(`Failed to connect to ${walletInfo.name}: ${error.message}`);
        }
      } else {
        setError(`Failed to connect to ${walletInfo.name}`);
      }
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectWallet = () => {
    onDisconnect();
    setError(null);
    setWalletBalance('');
  };

  const formatBalance = (balance: string): string => {
    try {
      const ada = parseFloat(balance);
      if (isNaN(ada)) return '0.00 ADA';
      return `${ada.toFixed(2)} ADA`;
    } catch {
      return '0.00 ADA';
    }
  };

  // Modal styling classes
  const containerClass = isModal ? 'space-y-4' : 'space-y-6';
  const headerClass = isModal ? 'text-base font-medium text-gray-900' : 'text-lg font-medium text-gray-900';

  // If wallet is connected, show connected state
  if (connectedWallet) {
    return (
      <div className={containerClass}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">
                  Connected to {connectedWallet.name}
                </h3>
                {connectedWallet.address && (
                  <p className="text-sm text-green-700 font-mono">
                    {connectedWallet.address.substring(0, 25)}...
                  </p>
                )}
                {(connectedWallet.balance || walletBalance) && (
                  <p className="text-sm text-green-600">
                    Balance: {formatBalance(connectedWallet.balance || walletBalance)}
                  </p>
                )}
              </div>
            </div>
            {!isModal && (
              <button
                onClick={disconnectWallet}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Additional wallet info for modal */}
        {isModal && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Network:</span>
                  <div className="font-medium">
                    {connectedWallet.networkId === 1 ? 'Mainnet' : 'Preview Testnet'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium text-green-600">Connected</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={disconnectWallet}
              className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded-lg transition-colors"
            >
              Disconnect Wallet
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Connection Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 hover:text-red-800 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Available Wallets */}
      {availableWallets.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className={headerClass}>Available Wallets</h3>
            <button
              onClick={detectWallets}
              disabled={isRefreshing}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          
          <div className="grid gap-3">
            {availableWallets.map(({ key, info }) => (
              <button
                key={key}
                onClick={() => connectWallet(key, info)}
                disabled={isConnecting === key}
                className="flex items-center space-x-4 p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {info.icon && (
                  <div className={`${isModal ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center`}>
                    <img 
                      src={info.icon} 
                      alt={`${info.name} icon`}
                      className={`${isModal ? 'w-6 h-6' : 'w-8 h-8'} object-contain`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{info.name}</div>
                  <div className="text-sm text-gray-500">
                    Version: {info.version} {info.apiVersion && `• API: ${info.apiVersion}`}
                  </div>
                </div>
                
                {isConnecting === key && (
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Wallet className={`${isModal ? 'w-12 h-12' : 'w-16 h-16'} text-gray-400 mx-auto mb-4`} />
          <h3 className={`${isModal ? 'text-base' : 'text-lg'} font-medium text-gray-900 mb-2`}>
            No Cardano Wallets Found
          </h3>
          <p className="text-gray-600 mb-4">
            Please install a Cardano wallet extension to continue
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Supported wallets include:</p>
            <p>Nami, Eternl, Flint, Typhon, Yoroi, Lace, and more</p>
          </div>
          <button
            onClick={detectWallets}
            disabled={isRefreshing}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Again</span>
          </button>
        </div>
      )}
    </div>
  );
}