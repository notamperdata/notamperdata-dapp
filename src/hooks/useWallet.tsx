'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Wallet interfaces
export interface ConnectedWallet {
  name: string;
  api: any;
  address: string;
  balance: string;
  networkId: number;
  networkName: string;
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

// Network configuration based on detected network ID
const getNetworkFromId = (networkId: number): { name: string; isMainnet: boolean } => {
  // Expanded network detection
  const networkMap: { [key: number]: { name: string; isMainnet: boolean } } = {
    1: { name: 'Mainnet', isMainnet: true },
    0: { name: 'Preview Testnet', isMainnet: false },
    2: { name: 'Preprod Testnet', isMainnet: false },
    3: { name: 'Sanchonet', isMainnet: false }
  };
  return networkMap[networkId] || { name: `Unknown Network (${networkId})`, isMainnet: false };
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
      networkName: wallet.networkName,
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

// Robust balance parsing function that handles different wallet formats
const parseWalletBalance = (rawBalance: any): string => {
  try {
    let lovelaceAmount = 0;
    
    console.log('Parsing balance, raw type:', typeof rawBalance, 'value:', rawBalance);
    
    if (typeof rawBalance === 'string') {
      lovelaceAmount = parseInt(rawBalance) || 0;
    } else if (typeof rawBalance === 'number') {
      lovelaceAmount = rawBalance;
    } else if (typeof rawBalance === 'bigint') {
      lovelaceAmount = Number(rawBalance);
    } else if (typeof rawBalance === 'object' && rawBalance !== null) {
      const balanceObj = rawBalance as any;
      
      if (balanceObj.lovelace !== undefined) {
        lovelaceAmount = parseInt(balanceObj.lovelace) || 0;
      } else if (balanceObj.coin !== undefined) {
        lovelaceAmount = parseInt(balanceObj.coin) || 0;
      } else if (balanceObj.ada !== undefined) {
        lovelaceAmount = Math.floor(parseFloat(balanceObj.ada) * 1000000) || 0;
      } else if (balanceObj.value !== undefined) {
        lovelaceAmount = parseInt(balanceObj.value) || 0;
      } else if (balanceObj.amount !== undefined) {
        lovelaceAmount = parseInt(balanceObj.amount) || 0;
      } else if (balanceObj.quantity !== undefined) {
        lovelaceAmount = parseInt(balanceObj.quantity) || 0;
      } else {
        const strValue = String(rawBalance);
        lovelaceAmount = parseInt(strValue) || 0;
      }
    } else if (Array.isArray(rawBalance)) {
      lovelaceAmount = rawBalance.reduce((sum: number, utxo: any) => {
        let utxoAmount = 0;
        if (typeof utxo === 'string') {
          utxoAmount = parseInt(utxo) || 0;
        } else if (typeof utxo === 'number') {
          utxoAmount = utxo;
        } else if (typeof utxo === 'bigint') {
          utxoAmount = Number(utxo);
        } else if (utxo && typeof utxo === 'object') {
          const amount = utxo.amount || utxo.value || utxo.coin || utxo.lovelace || utxo.quantity || 0;
          utxoAmount = typeof amount === 'string' ? parseInt(amount) : Number(amount);
        }
        return sum + (isNaN(utxoAmount) ? 0 : utxoAmount);
      }, 0);
    }
    
    const adaAmount = lovelaceAmount / 1000000;
    return Number.isFinite(adaAmount) ? adaAmount.toFixed(6) : '0.000000';
  } catch (error) {
    console.error('Failed to parse wallet balance:', error);
    return '0.000000';
  }
};

export function WalletProvider({ children }: WalletProviderProps) {
  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      
      const cardanoWallet = (window as any).cardano?.[walletKey];
      if (!cardanoWallet) {
        throw new Error('Wallet not found');
      }

      const api = await cardanoWallet.enable();
      if (!api) {
        throw new Error('Failed to enable wallet');
      }

      console.log('Wallet API enabled successfully');

      const [address, rawBalance, networkId] = await Promise.all([
        api.getChangeAddress().catch((err: any) => {
          console.warn('Failed to get address:', err);
          return api.getUsedAddresses?.().then((addrs: string[]) => addrs[0]) || 'Unknown address';
        }),
        api.getBalance().catch((err: any) => {
          console.warn('Failed to get balance:', err);
          return '0';
        }),
        api.getNetworkId().catch((err: any) => {
          console.warn('Failed to get network ID:', err);
          return 0;
        })
      ]);

      console.log('Wallet info retrieved:', {
        address: address?.substring(0, 20) + '...',
        rawBalance,
        networkId
      });

      const networkInfo = getNetworkFromId(networkId);
      console.log('Detected network:', networkInfo);

      const adaBalance = parseWalletBalance(rawBalance);

      const wallet: ConnectedWallet = {
        name: cardanoWallet.name || walletKey,
        api,
        address: address || 'Unknown address',
        balance: `${adaBalance} ADA`,
        networkId,
        networkName: networkInfo.name
      };

      setConnectedWallet(wallet);

      if (shouldStore) {
        saveWalletToStorage(walletKey, wallet);
      }

      console.log('Wallet connected successfully:', {
        name: wallet.name,
        balance: wallet.balance,
        networkId,
        networkName: wallet.networkName
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
    if (!connectedWallet?.api) {
      console.warn('Cannot update balance: No wallet connected');
      return;
    }

    try {
      const rawBalance = await connectedWallet.api.getBalance();
      const adaBalance = parseWalletBalance(rawBalance);
      
      setConnectedWallet(prev => prev ? {
        ...prev,
        balance: `${adaBalance} ADA`
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
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    updateBalance,
    clearError
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export const walletUtils = {
  formatBalance: (balance: string): string => {
    try {
      const ada = typeof balance === 'string' ? parseFloat(balance.replace(/[^0-9.-]+/g, '')) : Number(balance);
      if (isNaN(ada)) return '0.000000 ADA';
      return `${ada.toFixed(6)} ADA`;
    } catch {
      return '0.000000 ADA';
    }
  },

  adaToLovelace: (ada: number): bigint => {
    return BigInt(Math.floor(Number(ada) * 1_000_000));
  },

  lovelaceToAda: (lovelace: bigint | string | number): number => {
    const num = typeof lovelace === 'string' ? parseInt(lovelace) : Number(lovelace);
    return Number.isFinite(num) ? num / 1_000_000 : 0;
  },

  isValidAddress: (address: string): boolean => {
    if (!address) return false;
    // Enhanced Cardano address validation
    const cardanoPrefixes = ['addr1', 'addr_test1', 'stake1', 'stake_test1'];
    return cardanoPrefixes.some(prefix => address.startsWith(prefix)) && address.length > 50;
  },

  getNetworkName: (networkId: number): string => {
    return getNetworkFromId(networkId).name;
  },

  isMainnet: (networkId: number): boolean => {
    return getNetworkFromId(networkId).isMainnet;
  },

  hasSufficientBalance: (walletBalance: string, requiredAda: number): boolean => {
    try {
      const balance = parseFloat(walletBalance.replace(/[^0-9.-]+/g, ''));
      return Number.isFinite(balance) && balance >= requiredAda;
    } catch {
      return false;
    }
  },

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
        { key: 'begin', name: 'Begin' },
        { key: 'vespr', name: 'Vespr' }
      ];

      knownWallets.forEach(wallet => {
        if (window.cardano[wallet.key]) {
          const walletData = window.cardano[wallet.key];
          wallets.push({
            key: wallet.key,
            name: walletData.name || wallet.name,
            icon: walletData.icon
          });
        }
      });
    }
    
    return wallets;
  },

  parseBalance: parseWalletBalance
};