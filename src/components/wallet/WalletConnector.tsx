// src/components/wallet/WalletConnector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

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
}

export default function WalletConnector({ onConnect, onDisconnect, connectedWallet }: WalletConnectorProps) {
  const [availableWallets, setAvailableWallets] = useState<Array<{
    key: string;
    info: WalletInfo;
  }>>([]);
  
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

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

  useEffect(() => {
    // Initial detection
    detectWallets();
    
    // Periodic detection for wallet installation
    const interval = setInterval(detectWallets, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const connectWallet = async (walletKey: string, walletInfo: WalletInfo) => {
    setIsConnecting(walletKey);
    setError(null);

    try {
      console.log(`Connecting to ${walletInfo.name}...`);

      const cardanoWallet = (window as any).cardano?.[walletKey];
      if (!cardanoWallet) {
        throw new Error(`${walletInfo.name} wallet not found`);
      }

      // Enable wallet
      const api = await cardanoWallet.enable();
      
      // Get wallet information
      let address = '';
      let balance = '0';
      let networkId = 0;

      try {
        // Try to get change address first
        address = await api.getChangeAddress();
      } catch {
        try {
          // Fallback to unused addresses
          const unusedAddresses = await api.getUnusedAddresses();
          if (unusedAddresses && unusedAddresses.length > 0) {
            address = unusedAddresses[0];
          }
        } catch {
          try {
            // Final fallback to used addresses
            const usedAddresses = await api.getUsedAddresses();
            if (usedAddresses && usedAddresses.length > 0) {
              address = usedAddresses[0];
            }
          } catch (addressError) {
            console.warn('Could not get wallet address:', addressError);
          }
        }
      }

      try {
        // Try to get balance
        const balanceValue = await api.getBalance();
        if (Array.isArray(balanceValue)) {
          // Balance returned as array of assets
          const lovelaceAsset = balanceValue.find(asset => asset.unit === 'lovelace');
          if (lovelaceAsset) {
            balance = (parseInt(lovelaceAsset.quantity) / 1_000_000).toFixed(2);
          }
        } else if (typeof balanceValue === 'string') {
          // Balance returned as lovelace string
          balance = (parseInt(balanceValue) / 1_000_000).toFixed(2);
        }
      } catch {
        try {
          // Try alternative balance method
          const lovelace = await api.getLovelace();
          balance = (parseInt(lovelace || '0') / 1_000_000).toFixed(2);
        } catch (balanceError) {
          console.warn('Could not get wallet balance:', balanceError);
        }
      }

      try {
        networkId = await api.getNetworkId();
        
        // Validate network
        const expectedNetworkId = process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0;
        if (networkId !== expectedNetworkId) {
          const networkName = expectedNetworkId === 1 ? 'Mainnet' : 'Preview Testnet';
          throw new Error(`Please switch your wallet to ${networkName}`);
        }
      } catch (networkError) {
        if (networkError instanceof Error && networkError.message.includes('switch')) {
          throw networkError; // Re-throw network mismatch errors
        }
        console.warn('Could not get network ID:', networkError);
      }

      const connectedWalletData: ConnectedWallet = {
        name: walletInfo.name,
        api,
        address,
        balance,
        networkId
      };

      console.log(`Successfully connected to ${walletInfo.name}:`, {
        address: address ? `${address.substring(0, 20)}...` : 'No address',
        balance: `${balance} ADA`,
        networkId
      });

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

  // If wallet is connected, show connected state
  if (connectedWallet) {
    return (
      <div className="space-y-4">
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
                {connectedWallet.balance && (
                  <p className="text-sm text-green-600">
                    Balance: {formatBalance(connectedWallet.balance)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={disconnectWallet}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 hover:border-red-400 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <h3 className="text-lg font-medium text-gray-900">Available Wallets</h3>
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
                  <div className="w-12 h-12 flex-shrink-0">
                    <img 
                      src={info.icon} 
                      alt={`${info.name} icon`} 
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-gray-900">{info.name}</h4>
                  <p className="text-sm text-gray-600">
                    {isConnecting === key ? 'Connecting...' : `Version ${info.version}`}
                  </p>
                </div>
                {isConnecting === key && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* No Wallets Detected */
        <div className="text-center py-8">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cardano Wallets Detected</h3>
          <p className="text-gray-600 mb-6">
            Install a Cardano wallet extension to get started with NoTamperData
          </p>
          
          <div className="text-sm text-gray-500 mb-4">
            Popular wallets: Nami, Eternl, Lace, Flint, Yoroi
          </div>
          
          <button
            onClick={detectWallets}
            disabled={isRefreshing}
            className="flex items-center space-x-2 mx-auto px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Again</span>
          </button>
        </div>
      )}

      {/* Network Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Network Information</h4>
        <div className="text-sm text-blue-800">
          <div>
            <strong>Expected Network:</strong> {process.env.NEXT_PUBLIC_CARDANO_NETWORK || 'Preview Testnet'}
          </div>
          <div className="mt-1">
            Make sure your wallet is connected to the correct network before proceeding.
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Having trouble connecting? Check our{' '}
          <a href="/docs/wallet-setup" className="text-blue-600 hover:underline">
            wallet setup guide
          </a>
        </p>
      </div>
    </div>
  );
}