// src/components/wallet/WalletConnector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, AlertCircle, CheckCircle, X, RefreshCw, ChevronDown } from 'lucide-react';

// Wallet connection interfaces
interface WalletInfo {
  name: string;
  icon: string;
  version: string;
  apiVersion: string;
}

export interface ConnectedWallet {
  name: string;
  api: any;
  address: string;
  balance: string;
  networkId: number;
  networkName: string;
}

interface WalletConnectorProps {
  onConnect: (wallet: ConnectedWallet) => void;
  onDisconnect: () => void;
  connectedWallet: ConnectedWallet | null;
  isModal?: boolean;
}

// Network detection helper
const getNetworkInfo = (networkId: number): { name: string; isMainnet: boolean } => {
  if (networkId === 1) {
    return { name: 'Mainnet', isMainnet: true };
  }
  // Default to Preview for testnet, but could be Preprod
  return { name: 'Preview Testnet', isMainnet: false };
};

// Robust balance parsing function
const parseWalletBalance = (rawBalance: any): string => {
  try {
    let lovelaceAmount = 0;
    
    console.log('WalletConnector: Parsing balance, type:', typeof rawBalance, 'value:', rawBalance);
    
    if (typeof rawBalance === 'string') {
      // Direct string format
      lovelaceAmount = parseInt(rawBalance) || 0;
    } else if (typeof rawBalance === 'number') {
      // Direct number format
      lovelaceAmount = rawBalance;
    } else if (typeof rawBalance === 'object' && rawBalance !== null && !Array.isArray(rawBalance)) {
      // Object format - check various possible properties
      const balanceObj = rawBalance as any;
      
      // Try different property names
      if (balanceObj.lovelace !== undefined) {
        lovelaceAmount = parseInt(balanceObj.lovelace) || 0;
      } else if (balanceObj.coin !== undefined) {
        lovelaceAmount = parseInt(balanceObj.coin) || 0;
      } else if (balanceObj.ada !== undefined) {
        // If ada is provided directly, convert to lovelace
        lovelaceAmount = Math.floor(parseFloat(balanceObj.ada) * 1000000) || 0;
      } else if (balanceObj.value !== undefined) {
        lovelaceAmount = parseInt(balanceObj.value) || 0;
      } else if (balanceObj.amount !== undefined) {
        lovelaceAmount = parseInt(balanceObj.amount) || 0;
      } else {
        // Try to stringify and parse
        const strValue = JSON.stringify(rawBalance);
        const match = strValue.match(/\d+/);
        if (match) {
          lovelaceAmount = parseInt(match[0]) || 0;
        }
      }
    } else if (Array.isArray(rawBalance)) {
      // UTXO array format - sum all amounts
      lovelaceAmount = rawBalance.reduce((sum: number, utxo: any) => {
        let utxoAmount = 0;
        if (typeof utxo === 'string' || typeof utxo === 'number') {
          utxoAmount = parseInt(String(utxo)) || 0;
        } else if (utxo && typeof utxo === 'object') {
          // Check various properties
          const amount = utxo.amount || utxo.value || utxo.coin || utxo.lovelace || 0;
          utxoAmount = parseInt(String(amount)) || 0;
        }
        return sum + utxoAmount;
      }, 0);
    }
    
    // Convert lovelace to ADA
    const adaAmount = lovelaceAmount / 1000000;
    return adaAmount.toFixed(2);
  } catch (error) {
    console.error('WalletConnector: Failed to parse balance:', error);
    return '0.00';
  }
};

const WalletConnector: React.FC<WalletConnectorProps> = ({
  onConnect,
  onDisconnect,
  connectedWallet,
  isModal = false
}) => {
  const [availableWallets, setAvailableWallets] = useState<Array<{ key: string; info: WalletInfo }>>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Detect available wallets
  const detectWallets = () => {
    setIsRefreshing(true);
    const detected: Array<{ key: string; info: WalletInfo }> = [];

    try {
      if (typeof window !== 'undefined' && window.cardano) {
        const knownWallets = [
          'nami', 'eternl', 'flint', 'typhon', 'yoroi', 
          'gerowallet', 'cardwallet', 'nufi', 'lace', 'begin', 'vespr'
        ];

        for (const walletKey of knownWallets) {
          const wallet = (window as any).cardano[walletKey];
          if (wallet) {
            try {
              const walletInfo: WalletInfo = {
                name: wallet.name || walletKey.charAt(0).toUpperCase() + walletKey.slice(1),
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
      }
    } catch (error) {
      console.error('Error detecting wallets:', error);
      setError('Failed to detect available wallets');
    }

    setAvailableWallets(detected);
    setIsRefreshing(false);
  };

  // Update wallet balance
  const updateWalletBalance = async () => {
    if (!connectedWallet?.api) return;

    try {
      const rawBalance = await connectedWallet.api.getBalance();
      const adaBalance = parseWalletBalance(rawBalance);
      setWalletBalance(`${adaBalance} ADA`);
      
      console.log('Balance updated:', `${adaBalance} ADA`);
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
      
      if (!api) {
        throw new Error('Failed to enable wallet');
      }

      // Get wallet details with proper error handling
      const [networkId, address, rawBalance] = await Promise.all([
        api.getNetworkId().catch((err: any) => {
          console.warn('Failed to get network ID:', err);
          return 0; // Default to testnet
        }),
        api.getChangeAddress().catch(async (err: any) => {
          console.warn('Failed to get change address, trying used addresses:', err);
          try {
            const usedAddresses = await api.getUsedAddresses();
            return usedAddresses?.[0] || 'Unknown address';
          } catch {
            return 'Unknown address';
          }
        }),
        api.getBalance().catch((err: any) => {
          console.warn('Failed to get balance:', err);
          return '0';
        })
      ]);

      // Get network information from detected network ID
      const networkInfo = getNetworkInfo(networkId);
      console.log('Detected network:', networkInfo);

      // Parse balance
      const adaBalance = parseWalletBalance(rawBalance);
      
      const connectedWalletData: ConnectedWallet = {
        name: walletInfo.name,
        api,
        address: address || 'Unknown address',
        balance: `${adaBalance} ADA`,
        networkId,
        networkName: networkInfo.name
      };

      console.log('Wallet connected successfully:', {
        name: walletInfo.name,
        address: address?.substring(0, 20) + '...',
        balance: `${adaBalance} ADA`,
        network: networkInfo.name
      });

      setWalletBalance(`${adaBalance} ADA`);
      onConnect(connectedWalletData);

    } catch (error) {
      console.error(`Failed to connect to ${walletInfo.name}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          setError('Connection was cancelled by user');
        } else if (error.message.includes('network')) {
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
    setShowWalletDetails(false);
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

  const truncateAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Modal styling classes
  const containerClass = isModal ? 'space-y-4' : 'space-y-6';
  const headerClass = isModal ? 'text-lg font-semibold' : 'text-xl font-bold';

  return (
    <div className={containerClass}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Error</span>
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
                  {truncateAddress(connectedWallet.address)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Balance:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {walletBalance || connectedWallet.balance}
                  </span>
                  <button
                    onClick={updateWalletBalance}
                    className="text-gray-400 hover:text-gray-600"
                    title="Refresh balance"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Network:</span>
                <span className="text-sm font-medium text-gray-900">
                  {connectedWallet.networkName}
                </span>
              </div>
            </div>

            {showWalletDetails && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Network ID: {connectedWallet.networkId}</p>
                  <p className="font-mono break-all">Full Address: {connectedWallet.address}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={disconnectWallet}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Available Wallets */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className={headerClass}>Available Wallets</h3>
              <button
                onClick={detectWallets}
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
              </div>
            ) : (
              <div className="grid gap-3">
                {availableWallets.map(({ key, info }) => (
                  <button
                    key={key}
                    onClick={() => connectWallet(key, info)}
                    disabled={isConnecting !== null}
                    className={`
                      relative flex items-center justify-between p-4 rounded-lg border-2 
                      transition-all duration-200
                      ${isConnecting === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                      }
                      ${isConnecting !== null && isConnecting !== key ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      {info.icon ? (
                        <img 
                          src={info.icon} 
                          alt={info.name} 
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {info.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{info.name}</p>
                        <p className="text-xs text-gray-500">v{info.version}</p>
                      </div>
                    </div>
                    
                    {isConnecting === key && (
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