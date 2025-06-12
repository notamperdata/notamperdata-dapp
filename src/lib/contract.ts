// lib/contract.ts
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  Data,
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
    
    const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf8'));
    
    const spendValidator = plutusJson.validators.find(
      (v: any) => v.title === 'adaverc_registry.adaverc_registry.spend'
    );
    
    if (!spendValidator) {
      const availableValidators = plutusJson.validators.map((v: any) => v.title).join(', ');
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
export async function initLucidWithConfig(config: ContractConfig): Promise<LucidEvolution> {
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

// Create Adaverc metadata according to specification
export function createAdavercMetadata(hash: string, metadata: any) {
  return {
    8434: { // ADAV label as specified in the smart contract specification
      hash: hash,
      form_id: metadata.formId,
      response_id: metadata.responseId,
      timestamp: Date.now(),
      version: "1.0"
    }
  };
}

// Validate hash format
export function validateHashFormat(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

// Format ADA amount for display
export function formatAda(lovelace: bigint): string {
  return (Number(lovelace) / 1_000_000).toFixed(6) + ' ADA';
}

// Check wallet balance
export async function checkWalletBalance(lucid: LucidEvolution): Promise<{ lovelace: bigint; formatted: string }> {
  const utxos = await lucid.wallet().getUtxos();
  const totalLovelace = utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, BigInt(0));
  
  return {
    lovelace: totalLovelace,
    formatted: formatAda(totalLovelace)
  };
}

// Estimate transaction cost
export function estimateTransactionCost(): { storage: bigint; fee: bigint; total: bigint } {
  return {
    storage: BigInt(2_000_000), // 2 ADA for contract storage
    fee: BigInt(175_000),       // ~0.175 ADA estimated transaction fee
    total: BigInt(2_175_000)    // ~2.175 ADA total
  };
}