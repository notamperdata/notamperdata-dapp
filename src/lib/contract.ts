// lib/contract.ts
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { Network } from '@lucid-evolution/core-types';
import * as fs from 'fs';
import * as path from 'path';

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

// Interface for plutus.json structure
interface PlutusJson {
  validators: ValidatorData[];
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

// Load validator from plutus.json
export function loadAdavercValidator(): { compiledCode: string; hash: string } {
  try {
    const plutusJsonPath = path.join(process.cwd(), 'plutus.json');
    
    if (!fs.existsSync(plutusJsonPath)) {
      throw new Error(
        'plutus.json not found in project root. Please copy it from the smart contract project.\n' +
        'Expected location: ' + plutusJsonPath
      );
    }
    
    const plutusJson: PlutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf8'));
    
    const spendValidator = plutusJson.validators.find(
      (v: ValidatorData) => v.title === 'adaverc_registry.adaverc_registry.spend'
    );
    
    if (!spendValidator) {
      const availableValidators = plutusJson.validators.map((v: ValidatorData) => v.title).join(', ');
      throw new Error(
        `Adaverc registry spend validator not found in plutus.json.\n` +
        `Available validators: ${availableValidators}`
      );
    }
    
    return {
      compiledCode: spendValidator.compiledCode,
      hash: spendValidator.hash
    };
  } catch (error) {
    console.error('Error loading validator:', error);
    throw error;
  }
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

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, config.blockfrostProjectId),
    network
  );

  // Select wallet from mnemonic
  lucid.selectWallet.fromSeed(config.platformWalletMnemonic);

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