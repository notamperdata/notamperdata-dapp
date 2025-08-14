// src/components/wallet/WalletConnector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, X, RefreshCw, ChevronDown, Power } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { walletUtils } from '@/hooks/useWallet';

export interface ConnectedWallet {
  name: string;
  address: string;
  balance: string;
  networkId: number;
  networkName: string;
}

interface WalletConnectorProps {
  onConnect?: (wallet: ConnectedWallet) => void;
  onDisconnect?: () => void;
  connectedWallet?: ConnectedWallet | null;
  isModal?: boolean;
}

const WalletConnector: React.FC<WalletConnectorProps> = ({
  onConnect,
  onDisconnect,
  connectedWallet: externalWallet,
  isModal = false
}) => {
  const {
    connectedWallet: contextWallet,
    availableWallets,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    updateBalance,
    refreshWallets,
    clearError
  } = useWallet();

  // Use external wallet if provided, otherwise use context
  const connectedWallet = externalWallet || (contextWallet ? {
    name: contextWallet.name,
    address: contextWallet.address,
    balance: contextWallet.balance,
    networkId: contextWallet.networkId,
    networkName: contextWallet.networkName
  } : null);

  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  // Handle wallet connection
  const handleConnect = async (walletName: string) => {
    setConnectingWallet(walletName);
    clearError();
    
    try {
      await connectWallet(walletName);
      
      // If external onConnect callback provided, call it with wallet info
      if (onConnect && contextWallet) {
        onConnect({
          name: contextWallet.name,
          address: contextWallet.address,
          balance: contextWallet.balance,
          networkId: contextWallet.networkId,
          networkName: contextWallet.networkName
        });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setConnectingWallet(null);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletDetails(false);
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Refresh available wallets
  const handleRefreshWallets = async () => {
    setIsRefreshing(true);
    await refreshWallets();
    setIsRefreshing(false);
  };

  // Auto-refresh balance periodically
  useEffect(() => {
    if (connectedWallet) {
      const interval = setInterval(() => {
        updateBalance();
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [connectedWallet]);

  // Modal styling classes
  const containerClass = isModal ? 'space-y-4' : 'space-y-6';
  const headerClass = isModal ? 'text-lg font-semibold' : 'text-xl font-bold';

  return (
    <div className={containerClass}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Connected Wallet Display */}
      {connectedWallet ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Connected</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  walletUtils.getNetworkBadgeClasses(connectedWallet.networkId)
                }`}>
                  {connectedWallet.networkName}
                </span>
              </div>
              <button
                onClick={() => setShowWalletDetails(!showWalletDetails)}
                className="text-green-600 hover:text-green-700"
              >
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${showWalletDetails ? 'rotate-180' : ''}`} 
                />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Wallet:</span>
                <span className="text-sm font-medium text-gray-900">{connectedWallet.name}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Address:</span>
                <span className="text-sm font-mono text-gray-900">
                  {walletUtils.formatAddress(connectedWallet.address)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Balance:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {connectedWallet.balance}
                  </span>
                  <button
                    onClick={updateBalance}
                    className="text-gray-400 hover:text-gray-600"
                    title="Refresh balance"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {showWalletDetails && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Network ID: {connectedWallet.networkId}</p>
                  <p className="font-mono break-all">Full Address: {connectedWallet.address}</p>
                  <a
                    href={walletUtils.getAddressExplorerUrl(connectedWallet.address, connectedWallet.networkId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center"
                  >
                    View on Explorer →
                  </a>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Power className="w-4 h-4" />
            <span>Disconnect Wallet</span>
          </button>
        </div>
      ) : (
        <>
          {/* Available Wallets */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className={headerClass}>Available Wallets</h3>
              <button
                onClick={handleRefreshWallets}
                disabled={isRefreshing}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {availableWallets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No Cardano wallets detected</p>
                <p className="text-sm text-gray-500">
                  Please install a Cardano wallet extension like Nami, Eternl, or Flint
                </p>
                <button
                  onClick={handleRefreshWallets}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Check again
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet.name)}
                    disabled={isConnecting || connectingWallet !== null}
                    className={`
                      relative flex items-center justify-between p-4 rounded-lg border-2 
                      transition-all duration-200
                      ${connectingWallet === wallet.name 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                      }
                      ${(isConnecting || connectingWallet !== null) && connectingWallet !== wallet.name 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      {wallet.icon ? (
                        <img 
                          src={wallet.icon} 
                          alt={wallet.name} 
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {wallet.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{wallet.name}</p>
                        <p className="text-xs text-gray-500">v{wallet.version}</p>
                      </div>
                    </div>
                    
                    {connectingWallet === wallet.name && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-sm text-blue-600">Connecting...</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Installation Help */}
          {availableWallets.length === 0 && !isModal && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">How to Install a Wallet</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Visit the wallet website (e.g., namiwallet.io, eternl.io)</li>
                <li>Download the browser extension</li>
                <li>Create or restore your wallet</li>
                <li>Refresh this page to detect the wallet</li>
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WalletConnector;