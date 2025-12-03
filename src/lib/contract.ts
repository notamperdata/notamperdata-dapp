/* eslint-disable @typescript-eslint/no-unused-vars */

// src/lib/contract.ts
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  Network,
  LucidEvolution
} from '@lucid-evolution/lucid';

// Import Plutus data from generated file
import PLUTUS_DATA from '@/lib/plutus.json';

// NoTamperData constants
export const NoTamperData_CONSTANTS = {
  METADATA_LABEL: 8434,
  CONTRACT_UTXO_AMOUNT: BigInt(2_000_000), // 2 ADA minimum UTXO - kept for reference but not used in new self-send architecture
} as const;

// Contract deployment data - kept for reference but not used in new self-send architecture
// Design Decision: We've moved from contract-based to platform wallet self-send transactions
// for cost efficiency (only tx fees vs 2+ ADA locked per transaction)
export const DEPLOYMENT_DATA = {
  contractAddress: {
    Preview: 'addr_test1wqg448fq8u4ry04dtf3jsxqhw0avejz887ze5x0mtgpgw9gzzhue3',
    Preprod: 'addr_test1wqg448fq8u4ry04dtf3jsxqhw0avejz887ze5x0mtgpgw9gzzhue3',
    Mainnet: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn493x5cdqw2gq4vt'
  },
  validatorHash: {
    Preview: 'a2492486ed656e3fb854a2c240cf16055216c38ec94d166a533c5820',
    Preprod: 'a2492486ed656e3fb854a2c240cf16055216c38ec94d166a533c5820',
    Mainnet: 'a2492486ed656e3fb854a2c240cf16055216c38ec94d166a533c5820'
  }
};

// Network type mapping
export type NetworkType = 'Preview' | 'Preprod' | 'Mainnet';

// Configuration interface
export interface ContractConfig {
  blockfrostProjectId: string;
  platformWalletMnemonic: string;
  networkId: number;
  networkType: NetworkType;
  contractAddress: string; // Kept for reference but not used - new architecture uses platform wallet self-send
}

// Interface for validator structure - kept for compatibility
interface ValidatorData {
  title: string;
  compiledCode: string;
  hash: string;
}

// Network URLs for Blockfrost
export const networkUrls = {
  Preview: 'https://cardano-preview.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0'
};

/**
 * Resolve the Blockfrost project ID for a network.
 */
export function resolveBlockfrostProjectId(): string {
  const projectId = (process.env.BLOCKFROST_PROJECT_ID || '').trim();

  if (!projectId) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
  }

  return projectId;
}

/**
 * Get network type from network ID
 * Network ID 1 = Mainnet, 0 = Testnet (defaults to Preview)
 */
export function getNetworkTypeFromId(networkId: number): NetworkType {
  if (networkId === 1) {
    return 'Mainnet';
  }
  // Default to Preview for testnet
  // In production, you might want to make this configurable
  return 'Preview';
}

/**
 * Map network type string to Lucid Network type
 */
export function getLucidNetworkType(networkType: NetworkType): Network {
  switch (networkType) {
    case 'Preview': return 'Preview';
    case 'Preprod': return 'Preprod';
    case 'Mainnet': return 'Mainnet';
    default: 
      console.warn(`Unknown network type: ${networkType}, defaulting to Preview`);
      return 'Preview';
  }
}

/**
 * Load contract configuration
 * Note: Contract address kept for reference but actual transactions use platform wallet self-send
 */
export function loadContractConfig(networkId?: number): ContractConfig {
  // Get network ID from parameter or try to read from environment as fallback
  const detectedNetworkId = networkId ?? (
    (process.env.NEXT_PUBLIC_CARDANO_NETWORK || '').toLowerCase() === 'mainnet' ? 1 : 0
  );
  
  const networkType = getNetworkTypeFromId(detectedNetworkId);
  
  // Get contract address for reference (not used in actual transactions)
  const contractAddress = process.env.CONTRACT_ADDRESS || 
    process.env[`CONTRACT_ADDRESS_${networkType.toUpperCase()}`] ||
    DEPLOYMENT_DATA.contractAddress[networkType];

  const config: ContractConfig = {
    blockfrostProjectId: resolveBlockfrostProjectId(),
    platformWalletMnemonic: process.env.PLATFORM_WALLET_MNEMONIC || '',
    networkId: detectedNetworkId,
    networkType,
    contractAddress // Kept for reference but not used in new self-send architecture
  };

  // Validate required environment variables
  if (!config.platformWalletMnemonic) {
    throw new Error('PLATFORM_WALLET_MNEMONIC environment variable is required');
  }

  console.log('Contract config loaded (self-send architecture):', {
    networkId: config.networkId,
    networkType: config.networkType,
    contractAddress: config.contractAddress ? config.contractAddress.substring(0, 20) + '...' : 'Not set',
    hasBlockfrostId: !!config.blockfrostProjectId,
    hasWalletMnemonic: !!config.platformWalletMnemonic,
    note: 'Contract address kept for reference - actual transactions use platform wallet self-send'
  });

  return config;
}

/**
 * Load validator from embedded data
 * Note: Contract validator exists but is not actually used in the new self-send architecture.
 * We've moved to platform wallet self-send transactions for cost efficiency while maintaining
 * the same immutable proof capabilities through transaction metadata.
 */
export function loadNoTamperDataValidator(_networkType?: NetworkType): { 
  compiledCode: string; 
  hash: string 
} {
  console.log('📦 Loading validator from embedded data (not used in current self-send architecture)');
  
  const spendValidator = PLUTUS_DATA.validators.find(
    (v: ValidatorData) => v.title === 'NoTamperData_registry.NoTamperData_registry.spend'
  );
  
  if (!spendValidator) {
    const availableValidators = PLUTUS_DATA.validators.map((v: ValidatorData) => v.title).join(', ');
    throw new Error(
      `NoTamperData registry spend validator not found in embedded data.\n` +
      `Available validators: ${availableValidators}`
    );
  }
  
  console.log('✅ Validator loaded from embedded data (reference only - not actually used)');
  console.log('🔑 Validator hash:', spendValidator.hash);
  
  return {
    compiledCode: spendValidator.compiledCode,
    hash: spendValidator.hash
  };
}

/**
 * Create validator from compiled code - kept for compatibility but not used in new architecture
 */
export function createValidator(compiledCode: string): SpendingValidator {
  return {
    type: 'PlutusV2',
    script: compiledCode
  };
}

/**
 * Initialize Lucid with dynamic network configuration
 * Simplified for self-send architecture - no contract interaction needed
 */
export async function initializeLucid(
  networkId: number,
  blockfrostProjectId?: string,
  platformWalletMnemonic?: string
): Promise<LucidEvolution> {
  // Load config with the provided network ID
  const config = networkId !== undefined 
    ? loadContractConfig(networkId)
    : loadContractConfig();
    
  const finalBlockfrostId = blockfrostProjectId || config.blockfrostProjectId;
  const finalMnemonic = platformWalletMnemonic || config.platformWalletMnemonic;
  
  if (!finalBlockfrostId || !finalMnemonic) {
    throw new Error('Blockfrost project ID and wallet mnemonic are required');
  }
  
  console.log('🚀 Initializing Lucid for self-send architecture:', {
    network: config.networkType,
    networkId: config.networkId,
    hasBlockfrost: !!finalBlockfrostId,
    hasWallet: !!finalMnemonic
  });
  
  // Initialize Lucid with Blockfrost provider
  const lucid = await Lucid(
    new Blockfrost(networkUrls[config.networkType], finalBlockfrostId),
    getLucidNetworkType(config.networkType)
  );
  
  // Set wallet from mnemonic
  lucid.selectWallet.fromSeed(finalMnemonic);
  
  console.log('✅ Lucid initialized successfully for self-send transactions');
  
  return lucid;
}