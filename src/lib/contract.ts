// lib/contract.ts
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { Network } from '@lucid-evolution/core-types';

// EMBEDDED PLUTUS DATA - Replace this object with your plutus.json content
const PLUTUS_DATA = {
  "preamble": {
    "title": "ndigirigijohn/adaverc-sc",
    "description": "Aiken contracts for project 'ndigirigijohn/adaverc-sc'",
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
      "title": "adaverc_registry.adaverc_registry.spend",
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
      "title": "adaverc_registry.adaverc_registry.else",
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

// Configuration interface
interface ContractConfig {
  blockfrostProjectId: string;
  platformWalletMnemonic: string;
  network: 'Preview' | 'Preprod' | 'Mainnet';
  contractAddress: string;
}

// Interface for validator structure
interface ValidatorData {
  title: string;
  compiledCode: string;
  hash: string;
}

// Load environment configuration
export function loadContractConfig(): ContractConfig {
  const config = {
    blockfrostProjectId: process.env.BLOCKFROST_PROJECT_ID,
    platformWalletMnemonic: process.env.PLATFORM_WALLET_MNEMONIC,
    network: (process.env.CARDANO_NETWORK as 'Preview' | 'Preprod' | 'Mainnet') || 'Preview',
    contractAddress: process.env.CONTRACT_ADDRESS
  };

  // Validate required environment variables
  if (!config.blockfrostProjectId) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
  }
  
  if (!config.platformWalletMnemonic) {
    throw new Error('PLATFORM_WALLET_MNEMONIC environment variable is required');
  }
  
  if (!config.contractAddress) {
    throw new Error('CONTRACT_ADDRESS environment variable is required');
  }

  return config as ContractConfig;
}

// Network URLs for Blockfrost
export const networkUrls = {
  Preview: 'https://cardano-preview.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0'
};

// Load validator from embedded data ONLY - no file system access
export function loadAdavercValidator(): { compiledCode: string; hash: string } {
  console.log('📦 Loading validator from embedded data');
  
  const spendValidator = PLUTUS_DATA.validators.find(
    (v: ValidatorData) => v.title === 'adaverc_registry.adaverc_registry.spend'
  );
  
  if (!spendValidator) {
    const availableValidators = PLUTUS_DATA.validators.map((v: ValidatorData) => v.title).join(', ');
    throw new Error(
      `Adaverc registry spend validator not found in embedded data.\n` +
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

// Create validator from compiled code
export function createValidator(compiledCode: string): SpendingValidator {
  return {
    type: 'PlutusV2',
    script: compiledCode
  };
}

// Map network string to Network type
export function getNetworkType(networkStr: string): Network {
  switch (networkStr) {
    case 'Preview': return 'Preview';
    case 'Preprod': return 'Preprod';
    case 'Mainnet': return 'Mainnet';
    default: throw new Error(`Unsupported network: ${networkStr}`);
  }
}

// Initialize Lucid with configuration
export async function initializeLucid(config: ContractConfig): Promise<LucidEvolution> {
  const network = getNetworkType(config.network);
  const blockfrostUrl = networkUrls[config.network];

  console.log('🔧 Initializing Lucid with network:', network);
  console.log('🔗 Blockfrost URL:', blockfrostUrl);

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, config.blockfrostProjectId),
    network
  );

  // Select wallet from mnemonic
  lucid.selectWallet.fromSeed(config.platformWalletMnemonic);
  console.log('✅ Lucid initialized and wallet selected');

  return lucid;
}

// Utility function to validate hash format
export function validateHashFormat(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

// Utility function to validate contract address format
export function validateContractAddress(address: string): boolean {
  // Basic validation for Cardano addresses
  return address.startsWith('addr_test') || address.startsWith('addr');
}

// Interface for transaction metadata
export interface AdavercMetadata {
  hash: string;
  form_id: string;
  response_id: string;
  timestamp: number;
  version: string;
}

// Create standardized transaction metadata
export function createTransactionMetadata(
  hash: string, 
  formId: string, 
  responseId: string
): AdavercMetadata {
  return {
    hash,
    form_id: formId,
    response_id: responseId,
    timestamp: Date.now(),
    version: "1.0"
  };
}

// Constants for the Adaverc protocol
export const ADAVERC_CONSTANTS = {
  METADATA_LABEL: 8434,
  CONTRACT_UTXO_AMOUNT: BigInt(2000000), // 2 ADA in lovelace
  PROTOCOL_VERSION: "1.0"
} as const;

// Error types for better error handling
export class AdavercError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AdavercError';
  }
}

export class ValidationError extends AdavercError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class ConfigurationError extends AdavercError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR');
  }
}

export class BlockchainError extends AdavercError {
  constructor(message: string) {
    super(message, 'BLOCKCHAIN_ERROR');
  }
}