// src/hooks/useWallet.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserWallet, type Asset, deserializeAddress } from '@meshsdk/core';

// Wallet interfaces
export interface ConnectedWallet {
  name: string;
  wallet: BrowserWallet;
  address: string;
  verificationKeyHash: string;
  balance: string;
  lovelace: string;
  assets: Asset[];
  networkId: number;
  networkName: string;
  lastConnected: number;
}

interface WalletContextType {
  connectedWallet: ConnectedWallet | null;
  availableWallets: Array<{ name: string; icon: string; version: string }>;
  isConnecting: boolean;
  error: string | null;
  connectWallet: (walletName: string) => Promise<void>;
  disconnectWallet: () => void;
  updateBalance: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  clearError: () => void;
}

// Network configuration based on detected network ID
const getNetworkFromId = (networkId: number): { name: string; isMainnet: boolean } => {
  if (networkId === 1) {
    return { name: 'Mainnet', isMainnet: true };
  }
  return { name: 'Preview Testnet', isMainnet: false };
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = 'notamperdata_wallet_connection';

interface WalletProviderProps {
  children: ReactNode;
}

// Save wallet connection to storage
const saveWalletToStorage = (wallet: ConnectedWallet) => {
  try {
    const walletData = {
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance,
      networkId: wallet.networkId,
      networkName: wallet.networkName,
      lastConnected: wallet.lastConnected
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
  } catch (error) {
    console.warn('Failed to save wallet to storage:', error);
  }
};

// Load wallet from storage
const loadWalletFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const walletData = JSON.parse(stored);
      // Check if stored data is less than 24 hours old
      const isRecent = Date.now() - walletData.lastConnected < 24 * 60 * 60 * 1000;
      if (isRecent) {
        return walletData;
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (error) {
    console.warn('Failed to load wallet from storage:', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

export function WalletProvider({ children }: WalletProviderProps) {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Array<{ name: string; icon: string; version: string }>>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available wallets
  const refreshWallets = async () => {
    try {
      const wallets = await BrowserWallet.getAvailableWallets();
      setAvailableWallets(wallets);
      console.log('Available wallets:', wallets);
    } catch (error) {
      console.error('Error fetching available wallets:', error);
      setError('Failed to load available wallets');
    }
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Load available wallets
      await refreshWallets();

      // Check for saved connection
      const savedConnection = loadWalletFromStorage();
      if (savedConnection && savedConnection.name) {
        try {
          console.log('Attempting to restore wallet connection:', savedConnection.name);
          await connectWallet(savedConnection.name);
        } catch (error) {
          console.log('Failed to restore wallet connection:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    initialize();
  }, []);

  const connectWallet = async (walletName: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log(`Connecting to wallet: ${walletName}`);
      
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
      
      // Deserialize address to get verification key hash
      const { pubKeyHash } = deserializeAddress(firstAddress);
      
      // Get network ID
      const networkId = await wallet.getNetworkId();
      const networkInfo = getNetworkFromId(networkId);
      
      // Get balance - this is the key difference from raw CIP-30
      let lovelace = "0";
      let assets: Asset[] = [];
      
      try {
        // Try the direct getLovelace method first (most wallets support this)
        lovelace = await wallet.getLovelace();
        console.log('Got lovelace directly:', lovelace);
      } catch (error) {
        console.log('getLovelace failed, trying getBalance:', error);
        try {
          // Fallback to getBalance and extract lovelace
          const balance = await wallet.getBalance();
          const lovelaceAsset = balance.find((asset: { unit: string; }) => asset.unit === 'lovelace');
          if (lovelaceAsset) {
            lovelace = lovelaceAsset.quantity;
          }
          // Filter out lovelace to get other assets
          assets = balance.filter((asset: { unit: string; }) => asset.unit !== 'lovelace');
        } catch (balanceError) {
          console.error('Error fetching balance:', balanceError);
        }
      }
      
      // Try to get assets if not already fetched
      if (assets.length === 0) {
        try {
          assets = await wallet.getAssets();
        } catch (error) {
          console.log('Could not fetch assets:', error);
        }
      }
      
      // Convert lovelace to ADA for display
      const adaBalance = (parseInt(lovelace || "0") / 1000000).toFixed(2);
      
      const walletInfo: ConnectedWallet = {
        name: walletName,
        wallet,
        address: firstAddress,
        verificationKeyHash: pubKeyHash,
        balance: `${adaBalance} ADA`,
        lovelace,
        assets,
        networkId,
        networkName: networkInfo.name,
        lastConnected: Date.now()
      };

      setConnectedWallet(walletInfo);
      saveWalletToStorage(walletInfo);

      console.log('Wallet connected successfully:', {
        name: walletName,
        address: firstAddress.substring(0, 20) + '...',
        balance: `${adaBalance} ADA`,
        networkName: networkInfo.name,
        assetsCount: assets.length
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      let errorMessage = 'Failed to connect wallet';
      if (error instanceof Error) {
        if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          errorMessage = 'Connection was cancelled by user';
        } else if (error.message.includes('network')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Failed to connect: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    console.log('Wallet disconnected');
  };

  const updateBalance = async () => {
    if (!connectedWallet?.wallet) {
      console.warn('Cannot update balance: No wallet connected');
      return;
    }

    try {
      console.log('Updating wallet balance...');
      
      let lovelace = "0";
      let assets: Asset[] = [];
      
      try {
        // Try direct getLovelace method
        lovelace = await connectedWallet.wallet.getLovelace();
      } catch (error) {
        // Fallback to getBalance
        console.log(error)
        try {
          const balance = await connectedWallet.wallet.getBalance();
          const lovelaceAsset = balance.find((asset: { unit: string; }) => asset.unit === 'lovelace');
          if (lovelaceAsset) {
            lovelace = lovelaceAsset.quantity;
          }
          assets = balance.filter((asset: { unit: string; }) => asset.unit !== 'lovelace');
        } catch (balanceError) {
          console.error('Error updating balance:', balanceError);
        }
      }
      
      // Try to get assets
      if (assets.length === 0) {
        try {
          assets = await connectedWallet.wallet.getAssets();
        } catch (error) {
          console.log('Could not fetch assets:', error);
        }
      }
      
      const adaBalance = (parseInt(lovelace || "0") / 1000000).toFixed(2);
      
      setConnectedWallet(prev => prev ? {
        ...prev,
        balance: `${adaBalance} ADA`,
        lovelace,
        assets
      } : null);
      
      console.log('Balance updated:', `${adaBalance} ADA`);
    } catch (error) {
      console.error('Failed to update balance:', error);
      setError('Failed to update balance');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: WalletContextType = {
    connectedWallet,
    availableWallets,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    updateBalance,
    refreshWallets,
    clearError
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Export utility functions for wallet operations
export const walletUtils = {
  /**
   * Format address for display
   */
  formatAddress: (address: string, length: number = 8): string => {
    if (!address || address.length <= length * 2) return address;
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
  },

  /**
   * Format balance for display
   */
  formatBalance: (lovelace: string): string => {
    const ada = parseInt(lovelace || "0") / 1000000;
    if (ada >= 1000000) return `${(ada / 1000000).toFixed(1)}M ADA`;
    if (ada >= 1000) return `${(ada / 1000).toFixed(1)}K ADA`;
    return `${ada.toFixed(2)} ADA`;
  },

  /**
   * Convert ADA to Lovelace
   */
  adaToLovelace: (ada: number): bigint => {
    return BigInt(Math.floor(ada * 1_000_000));
  },

  /**
   * Convert Lovelace to ADA
   */
  lovelaceToAda: (lovelace: bigint | string): number => {
    return Number(lovelace) / 1_000_000;
  },

  /**
   * Validate Cardano address format
   */
  isValidAddress: (address: string): boolean => {
    return address.startsWith('addr_test') || address.startsWith('addr');
  },

  /**
   * Get network name from network ID
   */
  getNetworkName: (networkId: number): string => {
    const networkInfo = getNetworkFromId(networkId);
    return networkInfo.name;
  },

  /**
   * Check if network is mainnet
   */
  isMainnet: (networkId: number): boolean => {
    return networkId === 1;
  },

  /**
   * Check if wallet has sufficient balance
   */
  hasSufficientBalance: (lovelace: string, requiredAda: number): boolean => {
    try {
      const availableAda = parseInt(lovelace || "0") / 1000000;
      return availableAda >= requiredAda;
    } catch {
      return false;
    }
  },

  /**
   * Validate if address belongs to the correct network
   */
  isAddressForNetwork: (address: string, networkId: number): boolean => {
    const isMainnet = networkId === 1;
    const isMainnetAddress = address.startsWith('addr1');
    const isTestnetAddress = address.startsWith('addr_test1');
    
    return (isMainnet && isMainnetAddress) || (!isMainnet && isTestnetAddress);
  },

  /**
   * Get network badge color classes
   */
  getNetworkBadgeClasses: (networkId: number): string => {
    if (networkId === 1) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  },

  /**
   * Calculate transaction fee estimate
   */
  estimateTransactionFee: (networkId: number): number => {
    // Basic fee estimation (in ADA)
    return networkId === 1 ? 0.2 : 0.17;
  },

  /**
   * Validate transaction hash format
   */
  isValidTxHash: (txHash: string): boolean => {
    return /^[a-fA-F0-9]{64}$/.test(txHash);
  },

  /**
   * Get explorer URL for transaction
   */
  getExplorerUrl: (txHash: string, networkId: number): string => {
    if (networkId === 1) {
      return `https://cardanoscan.io/transaction/${txHash}`;
    }
    return `https://preview.cardanoscan.io/transaction/${txHash}`;
  },

  /**
   * Get explorer URL for address
   */
  getAddressExplorerUrl: (address: string, networkId: number): string => {
    if (networkId === 1) {
      return `https://cardanoscan.io/address/${address}`;
    }
    return `https://preview.cardanoscan.io/address/${address}`;
  },

  /**
   * Parse error messages from wallet operations
   */
  parseWalletError: (error: any): string => {
    if (!error) return 'Unknown wallet error';
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error.message) {
      if (error.message.includes('User declined') || 
          error.message.includes('cancelled') ||
          error.message.includes('rejected')) {
        return 'Transaction cancelled by user';
      }
      if (error.message.includes('insufficient')) {
        return 'Insufficient funds in wallet';
      }
      if (error.message.includes('network')) {
        return 'Network mismatch or connection error';
      }
      if (error.message.includes('locked')) {
        return 'Wallet is locked. Please unlock it and try again';
      }
      return error.message;
    }
    
    return 'Wallet operation failed';
  }
};