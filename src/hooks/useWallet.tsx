// src/hooks/useWallet.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Wallet interfaces
export interface ConnectedWallet {
  name: string;
  api: any;
  address: string;
  balance: string;
  networkId: number;
}

interface WalletContextType {
  connectedWallet: ConnectedWallet | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: (walletKey: string) => Promise<void>;
  disconnectWallet: () => void;
  updateBalance: () => Promise<void>;
  clearError: () => void;
}

// Network configuration utility
const getNetworkConfig = () => {
  const network = process.env.NEXT_PUBLIC_CARDANO_NETWORK || 'Preview';
  return {
    network,
    expectedNetworkId: network === 'Mainnet' ? 1 : 0,
    networkName: network === 'Mainnet' ? 'Mainnet' : 'Preview Testnet'
  };
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_KEY = 'notamperdata_connected_wallet';

interface WalletProviderProps {
  children: ReactNode;
}

// Utility functions for local storage
const saveWalletToStorage = (walletKey: string, wallet: ConnectedWallet) => {
  try {
    const walletData = {
      walletKey,
      name: wallet.name,
      address: wallet.address,
      balance: wallet.balance,
      networkId: wallet.networkId,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
  } catch (error) {
    console.warn('Failed to save wallet to storage:', error);
  }
};

const loadWalletFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const walletData = JSON.parse(stored);
      // Check if stored data is less than 24 hours old
      const isRecent = Date.now() - walletData.timestamp < 24 * 60 * 60 * 1000;
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
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Try to restore wallet connection on mount
  useEffect(() => {
    const restoreWallet = async () => {
      const storedWallet = loadWalletFromStorage();
      if (storedWallet && typeof window !== 'undefined') {
        try {
          console.log('Attempting to restore wallet connection:', storedWallet.name);
          await connectWallet(storedWallet.walletKey, false);
        } catch (error) {
          console.log('Failed to restore wallet connection:', error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    restoreWallet();
  }, []);

  const connectWallet = async (walletKey: string, shouldStore: boolean = true) => {
    setIsConnecting(true);
    setError(null);

    try {
      console.log(`Attempting to connect to wallet: ${walletKey}`);
      
      // Check if wallet exists
      const cardanoWallet = (window as any).cardano?.[walletKey];
      if (!cardanoWallet) {
        throw new Error('Wallet not found');
      }

      // Enable the wallet
      const api = await cardanoWallet.enable();
      if (!api) {
        throw new Error('Failed to enable wallet');
      }

      console.log('Wallet API enabled successfully');

      // Get wallet information with improved error handling
      const [address, rawBalance, networkId] = await Promise.all([
        api.getChangeAddress(),
        api.getBalance().catch((err:any) => {
          console.warn('Failed to get balance:', err);
          return '0';
        }),
        api.getNetworkId().catch((err:any) => {
          console.warn('Failed to get network ID:', err);
          return 0;
        })
      ]);

      console.log('Wallet info retrieved:', {
        address: address?.substring(0, 20) + '...',
        rawBalance,
        networkId
      });

      // Validate network using updated configuration
      const { expectedNetworkId, networkName } = getNetworkConfig();
      if (networkId !== expectedNetworkId) {
        throw new Error(`Please switch your wallet to ${networkName}`);
      }

      // Handle different balance formats and convert from lovelace to ADA
      let balance: string;
      if (typeof rawBalance === 'string') {
        balance = rawBalance;
      } else if (typeof rawBalance === 'object' && rawBalance !== null) {
        balance = rawBalance.lovelace || rawBalance.ada || '0';
      } else {
        balance = '0';
      }

      const lovelaceAmount = parseInt(balance) || 0;
      const adaBalance = (lovelaceAmount / 1000000).toFixed(2);

      const wallet: ConnectedWallet = {
        name: cardanoWallet.name || walletKey,
        api,
        address: address || 'Unknown address',
        balance: `${adaBalance} ADA`,
        networkId
      };

      setConnectedWallet(wallet);

      // Save to storage if requested
      if (shouldStore) {
        saveWalletToStorage(walletKey, wallet);
      }

      console.log('Wallet connected successfully:', {
        name: wallet.name,
        balance: wallet.balance,
        networkId
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      let errorMessage = 'Failed to connect wallet';
      if (error instanceof Error) {
        if (error.message.includes('User declined') || error.message.includes('cancelled')) {
          errorMessage = 'Connection was cancelled by user';
        } else if (error.message.includes('network') || error.message.includes('switch')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
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
    if (!connectedWallet?.api) return;

    try {
      console.log('Updating wallet balance...');
      const rawBalance = await connectedWallet.api.getBalance();
      console.log('New raw balance:', rawBalance);
      
      // Handle different balance formats
      let balance: string;
      if (typeof rawBalance === 'string') {
        balance = rawBalance;
      } else if (typeof rawBalance === 'object' && rawBalance !== null) {
        balance = rawBalance.lovelace || rawBalance.ada || '0';
      } else {
        balance = '0';
      }
      
      const lovelaceAmount = parseInt(balance) || 0;
      const adaBalance = (lovelaceAmount / 1000000).toFixed(2);
      const newBalance = `${adaBalance} ADA`;

      console.log('Updated balance:', newBalance);

      setConnectedWallet(prev => prev ? {
        ...prev,
        balance: newBalance
      } : null);

    } catch (error) {
      console.warn('Failed to update wallet balance:', error);
      // Don't throw error, just log warning
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: WalletContextType = {
    connectedWallet,
    isConnecting,
    error,
    connectWallet: (walletKey: string) => connectWallet(walletKey, true),
    disconnectWallet,
    updateBalance,
    clearError
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Utility functions for wallet operations
export const walletUtils = {
  /**
   * Format wallet address for display
   */
  formatAddress: (address: string, length: number = 8): string => {
    if (address.length <= length * 2) return address;
    return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
  },

  /**
   * Format balance for display
   */
  formatBalance: (balance: string | number): string => {
    try {
      const ada = typeof balance === 'string' ? parseFloat(balance) : balance;
      if (isNaN(ada)) return '0.00 ADA';
      return `${ada.toFixed(2)} ADA`;
    } catch {
      return '0.00 ADA';
    }
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
    // Basic validation for Cardano addresses
    return address.startsWith('addr_test') || address.startsWith('addr');
  },

  /**
   * Validate network compatibility
   */
  isValidNetwork: (networkId: number): boolean => {
    const { expectedNetworkId } = getNetworkConfig();
    return networkId === expectedNetworkId;
  },

  /**
   * Get network name from network ID
   */
  getNetworkName: (networkId: number): string => {
    return networkId === 1 ? 'Mainnet' : 'Preview Testnet';
  },

  /**
   * Check if wallet has sufficient balance
   */
  hasSufficientBalance: (walletBalance: string, requiredAda: number): boolean => {
    try {
      const balance = parseFloat(walletBalance);
      return balance >= requiredAda;
    } catch {
      return false;
    }
  },

  /**
   * Detect available Cardano wallets
   */
  detectWallets: (): Array<{ key: string; name: string; icon?: string }> => {
    const wallets: Array<{ key: string; name: string; icon?: string }> = [];
    
    if (typeof window !== 'undefined' && window.cardano) {
      const knownWallets = [
        { key: 'nami', name: 'Nami' },
        { key: 'eternl', name: 'Eternl' },
        { key: 'flint', name: 'Flint' },
        { key: 'typhon', name: 'Typhon' },
        { key: 'yoroi', name: 'Yoroi' },
        { key: 'gerowallet', name: 'GeroWallet' },
        { key: 'cardwallet', name: 'CardWallet' },
        { key: 'nufi', name: 'NuFi' },
        { key: 'lace', name: 'Lace' },
        { key: 'begin', name: 'Begin' }
      ];

      knownWallets.forEach(wallet => {
        if (window.cardano[wallet.key]) {
          wallets.push(wallet);
        }
      });
    }
    
    return wallets;
  },

  /**
   * Get current network configuration
   */
  getNetworkConfig: () => getNetworkConfig()
};