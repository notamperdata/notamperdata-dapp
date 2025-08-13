

// src/lib/contract.ts
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  Network,
  LucidEvolution
} from '@lucid-evolution/lucid';

// Import embedded Plutus data
// import PLUTUS_DATA from '../../plutus.json';

const PLUTUS_DATA = {
  "preamble": {
    "title": "ndigirigijohn/NoTamperData-sc",
    "description": "Aiken contracts for project 'ndigirigijohn/NoTamperData-sc'",
    "version": "0.0.0",
    "plutusVersion": "v3",
    "compiler": {
      "name": "Aiken",
      "version": "v1.1.15+unknown"
    },
    "license": "Apache-2.0"
  },
  "validators": [
    {
      "title": "NoTamperData_registry.NoTamperData_registry.spend",
      "datum": {
        "title": "_datum",
        "schema": {
          "$ref": "#/definitions/Data"
        }
      },
      "redeemer": {
        "title": "_redeemer",
        "schema": {
          "$ref": "#/definitions/Data"
        }
      },
      "compiledCode": "585c01010029800aba2aba1aab9eaab9dab9a4888896600264653001300600198031803800cc0180092225980099b8748008c01cdd500144c8cc892898050009805180580098041baa0028a50401830060013003375400d149a26cac8009",
      "hash": "a2492486ed656e3fb854a2c240cf16055216c38ec94d166a533c5820"
    },
    {
      "title": "NoTamperData_registry.NoTamperData_registry.else",
      "redeemer": {
        "schema": {}
      },
      "compiledCode": "585c01010029800aba2aba1aab9eaab9dab9a4888896600264653001300600198031803800cc0180092225980099b8748008c01cdd500144c8cc892898050009805180580098041baa0028a50401830060013003375400d149a26cac8009",
      "hash": "a2492486ed656e3fb854a2c240cf16055216c38ec94d166a533c5820"
    }
  ],
  "definitions": {
    "Data": {
      "title": "Data",
      "description": "Any Plutus data."
    }
  }
};

// NoTamperData constants
export const NoTamperData_CONSTANTS = {
  METADATA_LABEL: 8434,
  CONTRACT_UTXO_AMOUNT: BigInt(2_000_000), // 2 ADA minimum UTXO
} as const;

// Embedded deployment data - loaded at build time
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

// Configuration interface - now with dynamic network
export interface ContractConfig {
  blockfrostProjectId: string;
  platformWalletMnemonic: string;
  networkId: number;
  networkType: NetworkType;
  contractAddress: string;
}

// Interface for validator structure
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
 * Load contract configuration with dynamic network support
 * Now accepts network ID as parameter instead of reading from environment
 */
export function loadContractConfig(networkId?: number): ContractConfig {
  // Get network ID from parameter or try to read from environment as fallback
  const detectedNetworkId = networkId ?? (
    process.env.NEXT_PUBLIC_CARDANO_NETWORK === 'Mainnet' ? 1 : 0
  );
  
  const networkType = getNetworkTypeFromId(detectedNetworkId);
  
  // Get contract address for the detected network
  const contractAddress = process.env.CONTRACT_ADDRESS || 
    process.env[`CONTRACT_ADDRESS_${networkType.toUpperCase()}`] ||
    DEPLOYMENT_DATA.contractAddress[networkType];

  const config: ContractConfig = {
    blockfrostProjectId: process.env.BLOCKFROST_PROJECT_ID || '',
    platformWalletMnemonic: process.env.PLATFORM_WALLET_MNEMONIC || '',
    networkId: detectedNetworkId,
    networkType,
    contractAddress
  };

  // Validate required environment variables
  if (!config.blockfrostProjectId) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
  }
  
  if (!config.platformWalletMnemonic) {
    throw new Error('PLATFORM_WALLET_MNEMONIC environment variable is required');
  }
  
  if (!config.contractAddress) {
    throw new Error(`No contract address found for network: ${networkType}`);
  }

  console.log('Contract config loaded:', {
    networkId: config.networkId,
    networkType: config.networkType,
    contractAddress: config.contractAddress.substring(0, 20) + '...',
    hasBlockfrostId: !!config.blockfrostProjectId,
    hasWalletMnemonic: !!config.platformWalletMnemonic
  });

  return config;
}

/**
 * Load validator from embedded data ONLY - no file system access
 */
export function loadNoTamperDataValidator(networkType?: NetworkType): { 
  compiledCode: string; 
  hash: string 
} {
  console.log('📦 Loading validator from embedded data');
  
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
  
  console.log('✅ Validator loaded from embedded data successfully');
  console.log('🔑 Validator hash:', spendValidator.hash);
  
  return {
    compiledCode: spendValidator.compiledCode,
    hash: spendValidator.hash
  };
}

/**
 * Create validator from compiled code
 */
export function createValidator(compiledCode: string): SpendingValidator {
  return {
    type: 'PlutusV2',
    script: compiledCode
  };
}

/**
 * Initialize Lucid with dynamic network configuration
 * Now accepts network ID instead of relying on environment variables
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

  // Allow overrides for project ID and mnemonic
  const projectId = blockfrostProjectId || config.blockfrostProjectId;
  const mnemonic = platformWalletMnemonic || config.platformWalletMnemonic;
  
  const network = getLucidNetworkType(config.networkType);
  const blockfrostUrl = networkUrls[config.networkType];

  console.log('🔧 Initializing Lucid with:', {
    network,
    networkId: config.networkId,
    networkType: config.networkType,
    blockfrostUrl
  });

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, projectId),
    network
  );

  // Select wallet from mnemonic if provided
  if (mnemonic) {
    lucid.selectWallet.fromSeed(mnemonic);
    console.log('✅ Lucid initialized with platform wallet');
  } else {
    console.log('✅ Lucid initialized without wallet selection');
  }

  return lucid;
}

/**
 * Initialize Lucid with browser wallet
 * For use in client-side components
 */
export async function initializeLucidWithBrowserWallet(
  walletApi: any,
  networkId: number
): Promise<LucidEvolution> {
  const networkType = getNetworkTypeFromId(networkId);
  const network = getLucidNetworkType(networkType);
  const blockfrostUrl = networkUrls[networkType];
  
  // Get Blockfrost project ID from environment
  const blockfrostProjectId = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || 
                              process.env.BLOCKFROST_PROJECT_ID;
  
  if (!blockfrostProjectId) {
    throw new Error('Blockfrost project ID not found in environment variables');
  }

  console.log('🔧 Initializing Lucid with browser wallet:', {
    network,
    networkId,
    networkType
  });

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, blockfrostProjectId),
    network
  );

  // Select the browser wallet
  lucid.selectWallet.fromAPI(walletApi);
  
  console.log('✅ Lucid initialized with browser wallet');
  return lucid;
}

/**
 * Get contract address for a specific network
 */
export function getContractAddress(networkId: number): string {
  const networkType = getNetworkTypeFromId(networkId);
  
  // Check environment variables first
  const envAddress = process.env.CONTRACT_ADDRESS || 
                    process.env[`CONTRACT_ADDRESS_${networkType.toUpperCase()}`];
  
  if (envAddress) {
    return envAddress;
  }
  
  // Fallback to embedded deployment data
  return DEPLOYMENT_DATA.contractAddress[networkType];
}

/**
 * Get validator hash for a specific network
 */
export function getValidatorHash(networkId: number): string {
  const networkType = getNetworkTypeFromId(networkId);
  
  // Check if we have network-specific validator hashes
  const validatorHash = DEPLOYMENT_DATA.validatorHash[networkType];
  
  if (!validatorHash) {
    // If no network-specific hash, try to load from validator
    const validator = loadNoTamperDataValidator(networkType);
    return validator.hash;
  }
  
  return validatorHash;
}

/**
 * Utility to check if an address belongs to a specific network
 */
export function isAddressForNetwork(address: string, networkId: number): boolean {
  const isMainnet = networkId === 1;
  const isMainnetAddress = address.startsWith('addr1');
  const isTestnetAddress = address.startsWith('addr_test1');
  
  return (isMainnet && isMainnetAddress) || (!isMainnet && isTestnetAddress);
}

/**
 * Export all network utilities
 */
export const networkUtils = {
  getNetworkTypeFromId,
  getLucidNetworkType,
  isMainnet: (networkId: number) => networkId === 1,
  isTestnet: (networkId: number) => networkId === 0,
  getBlockfrostUrl: (networkId: number) => {
    const networkType = getNetworkTypeFromId(networkId);
    return networkUrls[networkType];
  }
};