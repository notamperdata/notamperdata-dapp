// src/lib/paymentConfig.ts

// Payment configuration and constants
export const PAYMENT_CONSTANTS = {
  MIN_PAYMENT_AMOUNT: 1, // Minimum ADA payment
  MAX_PAYMENT_AMOUNT: 1000, // Maximum ADA payment
  METADATA_LABEL: 8434, // Metadata label for payment transactions
  TOKEN_RATE: 1, // 1 ADA = 1 token
  PLATFORM_FEE_PERCENTAGE: 0, // No additional fees
} as const;

// Platform wallet addresses by network
export const PLATFORM_ADDRESSES = {
  Preview: process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS_PREVIEW || 'addr_test1wqg448fq8u4ry04dtf3jsxqhw0avejz887ze5x0mtgpgw9gzzhue3',
  Preprod: process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS_PREPROD || 'addr_test1wqg448fq8u4ry04dtf3jsxqhw0avejz887ze5x0mtgpgw9gzzhue3',
  Mainnet: process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS_MAINNET || 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn493x5cdqw2gq4vt'
} as const;

// Network configuration
export type NetworkType = 'Preview' | 'Preprod' | 'Mainnet';

export const NETWORK_CONFIG = {
  Preview: {
    name: 'Preview Testnet',
    networkId: 0,
    blockfrostUrl: 'https://cardano-preview.blockfrost.io/api/v0'
  },
  Preprod: {
    name: 'Preprod Testnet', 
    networkId: 0,
    blockfrostUrl: 'https://cardano-preprod.blockfrost.io/api/v0'
  },
  Mainnet: {
    name: 'Mainnet',
    networkId: 1,
    blockfrostUrl: 'https://cardano-mainnet.blockfrost.io/api/v0'
  }
} as const;

// Payment validation functions
export const paymentValidation = {
  /**
   * Validate payment amount
   */
  isValidAmount: (amount: number): boolean => {
    return amount >= PAYMENT_CONSTANTS.MIN_PAYMENT_AMOUNT && 
           amount <= PAYMENT_CONSTANTS.MAX_PAYMENT_AMOUNT &&
           Number.isFinite(amount) && 
           amount > 0;
  },

  /**
   * Validate Cardano address format
   */
  isValidAddress: (address: string): boolean => {
    // Basic validation for Cardano addresses
    return address.startsWith('addr_test') || address.startsWith('addr');
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Calculate token amount from ADA payment
   */
  calculateTokens: (adaAmount: number): number => {
    return Math.floor(adaAmount * PAYMENT_CONSTANTS.TOKEN_RATE);
  },

  /**
   * Calculate total cost including fees
   */
  calculateTotalCost: (baseAmount: number): number => {
    const fee = baseAmount * (PAYMENT_CONSTANTS.PLATFORM_FEE_PERCENTAGE / 100);
    return baseAmount + fee;
  },

  /**
   * Validate network compatibility
   */
  isValidNetwork: (networkId: number, expectedNetwork: NetworkType): boolean => {
    return networkId === NETWORK_CONFIG[expectedNetwork].networkId;
  },

  /**
   * Get network name from network ID
   */
  getNetworkName: (networkId: number): string => {
    const network = Object.values(NETWORK_CONFIG).find(n => n.networkId === networkId);
    return network?.name || 'Unknown Network';
  }
};

// Transaction metadata helpers
export const transactionMetadata = {
  /**
   * Create payment metadata for NoTamperData transactions
   */
  createPaymentMetadata: (
    amount: number, 
    email?: string, 
    customData?: Record<string, any>
  ): Record<string, any> => {
    return {
      [PAYMENT_CONSTANTS.METADATA_LABEL]: {
        purpose: 'NoTamperData API Token Purchase',
        amount: amount,
        tokens: paymentValidation.calculateTokens(amount),
        timestamp: Date.now(),
        version: '1.0',
        ...(email && { email }),
        ...customData
      }
    };
  },

  /**
   * Parse payment metadata from transaction
   */
  parsePaymentMetadata: (metadata: any): {
    purpose?: string;
    amount?: number;
    tokens?: number;
    timestamp?: number;
    email?: string;
  } | null => {
    try {
      const paymentData = metadata?.[PAYMENT_CONSTANTS.METADATA_LABEL];
      if (!paymentData) return null;

      return {
        purpose: paymentData.purpose,
        amount: paymentData.amount,
        tokens: paymentData.tokens,
        timestamp: paymentData.timestamp,
        email: paymentData.email
      };
    } catch (error) {
      console.warn('Failed to parse payment metadata:', error);
      return null;
    }
  }
};

// Utility functions
export const paymentUtils = {
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
   * Format ADA amount for display
   */
  formatAda: (amount: number, decimals: number = 2): string => {
    return `${amount.toFixed(decimals)} ADA`;
  },

  /**
   * Get platform address for current network
   */
  getPlatformAddress: (network?: NetworkType): string => {
    const currentNetwork = network || (process.env.NEXT_PUBLIC_CARDANO_NETWORK as NetworkType) || 'Preview';
    return PLATFORM_ADDRESSES[currentNetwork];
  },

  /**
   * Get blockfrost URL for current network
   */
  getBlockfrostUrl: (network?: NetworkType): string => {
    const currentNetwork = network || (process.env.NEXT_PUBLIC_CARDANO_NETWORK as NetworkType) || 'Preview';
    return NETWORK_CONFIG[currentNetwork].blockfrostUrl;
  },

  /**
   * Generate transaction reference for tracking
   */
  generateTransactionRef: (): string => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ntd_${timestamp}_${random}`;
  },

  /**
   * Validate transaction hash format
   */
  isValidTxHash: (txHash: string): boolean => {
    return /^[a-fA-F0-9]{64}$/.test(txHash);
  }
};