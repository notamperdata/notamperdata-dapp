// src/app/api/storehash/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

// Configuration
const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;
const PLATFORM_WALLET_MNEMONIC = process.env.PLATFORM_WALLET_MNEMONIC;
const CARDANO_NETWORK = (process.env.CARDANO_NETWORK as 'Preview' | 'Preprod' | 'Mainnet') || 'Preview';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Network configuration
const networkUrls = {
  Preview: 'https://cardano-preview.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0'
};

// Load validator from plutus.json
function loadValidator(): { compiledCode: string; hash: string } {
  try {
    const plutusJsonPath = path.join(process.cwd(), 'plutus.json');
    
    if (!fs.existsSync(plutusJsonPath)) {
      throw new Error('plutus.json not found in project root. Please copy it from the smart contract project.');
    }
    
    const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf8'));
    
    const spendValidator = plutusJson.validators.find(
      (v: any) => v.title === 'adaverc_registry.adaverc_registry.spend'
    );
    
    if (!spendValidator) {
      throw new Error('Adaverc registry spend validator not found in plutus.json');
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
function createValidator(compiledCode: string): SpendingValidator {
  return {
    type: 'PlutusV2',
    script: compiledCode
  };
}

// Map network string to Network type
function getNetworkType(networkStr: string): Network {
  switch (networkStr) {
    case 'Preview': return 'Preview';
    case 'Preprod': return 'Preprod';
    case 'Mainnet': return 'Mainnet';
    default: throw new Error(`Unsupported network: ${networkStr}`);
  }
}

// Initialize Lucid
async function initLucid(): Promise<LucidEvolution> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
  }
  
  if (!PLATFORM_WALLET_MNEMONIC) {
    throw new Error('PLATFORM_WALLET_MNEMONIC environment variable is required');
  }

  const network = getNetworkType(CARDANO_NETWORK);
  const blockfrostUrl = networkUrls[CARDANO_NETWORK];

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, BLOCKFROST_PROJECT_ID),
    network
  );

  // Select wallet from mnemonic
  lucid.selectWallet.fromSeed(PLATFORM_WALLET_MNEMONIC);

  return lucid;
}

// Store hash on blockchain with metadata
async function storeHashOnBlockchain(hash: string, metadata: any): Promise<string> {
  try {
    console.log('🚀 Storing hash on blockchain:', hash);
    
    // Initialize Lucid
    const lucid = await initLucid();
    
    // Load validator
    const validator = loadValidator();
    const contractValidator = createValidator(validator.compiledCode);
    
    // Verify contract address matches
    if (!CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS environment variable is required');
    }
    
    console.log('📋 Using contract address:', CONTRACT_ADDRESS);
    
    // Create transaction metadata according to specification (label 8434)
    const txMetadata = {
      8434: { // ADAV label as specified
        hash: hash,
        form_id: metadata.formId,
        response_id: metadata.responseId,
        timestamp: Date.now(),
        version: "1.0"
      }
    };
    
    console.log('📝 Transaction metadata:', txMetadata);
    
    // Create transaction to store hash
    const tx = lucid
      .newTx()
      .pay.ToContract(
        CONTRACT_ADDRESS,
        { inline: Data.void() }, // Empty datum as per contract specification
        { lovelace: BigInt(2000000) } // 2 ADA as specified
      )
      .addMetadata(8434, txMetadata[8434]); // Add metadata with label 8434
    
    console.log('⚙️ Building transaction...');
    
    // Complete and sign transaction
    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign.withWallet().complete();
    
    console.log('📤 Submitting transaction...');
    
    // Submit transaction
    const txHash = await signedTx.submit();
    
    console.log('✅ Hash stored successfully on blockchain!');
    console.log('🔗 Transaction hash:', txHash);
    
    return txHash;
    
  } catch (error) {
    console.error('❌ Error storing hash on blockchain:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log("📥 STORE HASH - Contract-based endpoint");
  
  try {
    const body = await request.json();
    const { hash, metadata } = body;
    
    // Validate required fields
    if (!hash) {
      console.log('❌ Missing hash in request');
      return NextResponse.json(
        { error: 'Missing required field: hash' },
        { status: 400 }
      );
    }
    
    if (!metadata || !metadata.formId || !metadata.responseId) {
      console.log('❌ Missing required metadata fields');
      return NextResponse.json(
        { error: 'Missing required metadata fields (formId, responseId)' },
        { status: 400 }
      );
    }
    
    // Validate hash format (should be 64-character hex string)
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      console.log('❌ Invalid hash format');
      return NextResponse.json(
        { error: 'Invalid hash format. Expected 64-character hex string.' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Storing hash:', hash.substring(0, 16) + '...');
    console.log('📋 Metadata:', metadata);
    
    // Store hash on blockchain
    const transactionHash = await storeHashOnBlockchain(hash, metadata);
    
    // Return success response with blockchain transaction details
    return NextResponse.json({
      success: true,
      message: 'Hash stored successfully on blockchain',
      transactionHash: transactionHash,
      network: CARDANO_NETWORK,
      contractAddress: CONTRACT_ADDRESS,
      timestamp: new Date().toISOString(),
      blockchainProof: {
        label: 8434,
        hash: hash,
        txHash: transactionHash
      }
    });
    
  } catch (error: any) {
    console.error('💥 API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('plutus.json')) {
      return NextResponse.json(
        { 
          error: 'Smart contract configuration error. Please ensure plutus.json is properly configured.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    if (error.message?.includes('BLOCKFROST')) {
      return NextResponse.json(
        { 
          error: 'Blockchain connection error. Please check Blockfrost configuration.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    if (error.message?.includes('insufficient')) {
      return NextResponse.json(
        { 
          error: 'Insufficient funds in platform wallet. Please ensure wallet has enough ADA.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error while storing hash on blockchain',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}