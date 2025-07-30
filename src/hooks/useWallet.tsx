// src/hooks/useWallet.ts
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletAPI {
  getBalance(): Promise<string>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
  getUtxos(amount?: string): Promise<string[]>;
  enable(): Promise<WalletAPI>;
  isEnabled(): Promise<boolean>;
}

interface ConnectedWallet {
  name: string;
  api: WalletAPI;
  address: string;
  balance?: string;
  networkId?: number;
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

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Local storage keys
const STORAGE_KEY = 'notamperdata_wallet';
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface WalletStorage {
  walletKey: string;
  walletName: string;
  address: string;
  timestamp: number;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallet from storage on mount
  useEffect(() => {
    loadWalletFromStorage();
  }, []);

  // Set up balance update interval
  useEffect(() => {
    if (!connectedWallet) return;

    // Update balance immediately
    updateBalance();

    // Set up periodic balance updates
    const interval = setInterval(updateBalance, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [connectedWallet]);

  const loadWalletFromStorage = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const walletData: WalletStorage = JSON.parse(stored);
      const now = Date.now();

      // Check if stored data is expired
      if (now - walletData.timestamp > STORAGE_EXPIRY) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Check if wallet is still available
      if (typeof window !== 'undefined' && (window as any).cardano) {
        const cardanoWallet = (window as any).cardano[walletData.walletKey];
        if (cardanoWallet) {
          // Try to reconnect
          await connectWallet(walletData.walletKey, false); // Don't store again
        }
      }
    } catch (error) {
      console.warn('Failed to load wallet from storage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const saveWalletToStorage = (walletKey: string, wallet: ConnectedWallet) => {
    try {
      const walletData: WalletStorage = {
        walletKey,
        walletName: wallet.name,
        address: wallet.address,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
    } catch (error) {
      console.warn('Failed to save wallet to storage:', error);
    }
  };

  const connectWallet = async (walletKey: string, shouldStore: boolean = true) => {
    setIsConnecting(true);
    setError(null);

    try {
      const cardanoWallet = (window as any).cardano?.[walletKey];
      if (!cardanoWallet) {
        throw new Error('Wallet not found');
      }

      // Enable the wallet
      const api = await cardanoWallet.enable();
      if (!api) {
        throw new Error('Failed to enable wallet');
      }

      // Get wallet information
      const [address, balance, networkId] = await Promise.all([
        api.getChangeAddress(),
        api.getBalance().catch(() => '0'),
        api.getNetworkId().catch(() => 0)
      ]);

      // Validate network
      const expectedNetwork = process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0;
      if (networkId !== expectedNetwork) {
        const networkName = expectedNetwork === 1 ? 'Mainnet' : 'Preview Testnet';
        throw new Error(`Please switch your wallet to ${networkName}`);
      }

      // Convert balance from lovelace to ADA
      const adaBalance = (parseInt(balance) / 1000000).toFixed(2);

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

      console.log('Wallet connected successfully:', wallet.name);

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
      const balance = await connectedWallet.api.getBalance();
      const adaBalance = (parseInt(balance) / 1000000).toFixed(2);
      const newBalance = `${adaBalance} ADA`;

      setConnectedWallet(prev => prev ? {
        ...prev,
        balance: newBalance
      } : null);

    } catch (error) {
      console.warn('Failed to update wallet balance:', error);
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
    const expectedNetwork = process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0;
    return networkId === expectedNetwork;
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

    if (typeof window !== 'undefined' && (window as any).cardano) {
      const cardano = (window as any).cardano;
      
      for (const walletKey of Object.keys(cardano)) {
        try {
          const wallet = cardano[walletKey];
          if (wallet && typeof wallet === 'object' && (wallet.name || wallet.icon)) {
            wallets.push({
              key: walletKey,
              name: wallet.name || walletKey,
              icon: wallet.icon
            });
          }
        } catch (error) {
          console.warn(`Error detecting wallet ${walletKey}:`, error);
        }
      }
    }

    return wallets;
  }
};