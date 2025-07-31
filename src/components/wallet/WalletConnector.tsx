// src/components/wallet/WalletConnector.tsx - Complete updated file
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

  // Update wallet balance periodically
  const updateWalletBalance = async () => {
    if (!connectedWallet?.api) return;

    try {
      const balance = await connectedWallet.api.getBalance();
      const adaBalance = (parseInt(balance) / 1000000).toFixed(2);
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
      const balance = await api.getBalance();

      // Validate network
      const expectedNetwork = process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0;
      if (networkId !== expectedNetwork) {
        const networkName = expectedNetwork === 1 ? 'Mainnet' : 'Preview Testnet';
        throw new Error(`Please switch your wallet to ${networkName}`);
      }

      // Convert balance from lovelace to ADA
      const adaBalance = (parseInt(balance) / 1000000).toFixed(2);

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
                  <div className={`${isModal ? 'w-8 h-8' : 'w-10 h-10'} flex-shrink-0`}>
                    <img 
                      src={info.icon} 
                      alt={`${info.name} icon`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">
                    {info.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Version {info.version}
                  </div>
                </div>
                
                {isConnecting === key && (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-600">Connecting...</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Wallets Found</h3>
          <p className="text-gray-600 mb-4">
            Please install a Cardano wallet extension to continue
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Supported wallets:</p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span>Nami</span>
              <span>•</span>
              <span>Eternl</span>
              <span>•</span>
              <span>Flint</span>
              <span>•</span>
              <span>Typhon</span>
              <span>•</span>
              <span>Yoroi</span>
            </div>
          </div>
          <button
            onClick={detectWallets}
            disabled={isRefreshing}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isRefreshing ? 'Checking...' : 'Check Again'}
          </button>
        </div>
      )}
    </div>
  );
}