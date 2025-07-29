// src/app/api/storehash/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  Lucid, 
  Blockfrost, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { 
  loadContractConfig,
  networkUrls,
  getNetworkType,
  loadNoTamperDataValidator,
  NoTamperData_CONSTANTS
} from '@/lib/contract';

// Initialize Lucid using the contract utilities
async function initLucid(): Promise<LucidEvolution> {
  const config = loadContractConfig();
  
  console.log('🔧 Environment variables loaded:', {
    hasBlockfrostId: !!config.blockfrostProjectId,
    hasWalletMnemonic: !!config.platformWalletMnemonic,
    hasContractAddress: !!config.contractAddress,
    network: config.network
  });

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

// Interface for metadata
interface StoreMetadata {
  formId: string;
  responseId: string;
}

// Store hash on blockchain with metadata
async function storeHashOnBlockchain(hash: string, metadata: StoreMetadata): Promise<string> {
  try {
    console.log('🚀 Storing hash on blockchain:', hash);
    
    // Initialize Lucid
    const lucid = await initLucid();
    
    // Load validator using the embedded data (for future use)
    const validator = loadNoTamperDataValidator();
    console.log('📜 Validator loaded, hash:', validator.hash);
    
    // Get contract address from environment
    const config = loadContractConfig();
    console.log('📋 Using contract address:', config.contractAddress);
    
    // Create transaction metadata according to specification (label 8434)
    const txMetadata = {
      hash: hash,
      form_id: metadata.formId,
      response_id: metadata.responseId,
      timestamp: Date.now(),
      version: "1.0"
    };
    
    console.log('📝 Transaction metadata:', txMetadata);
    
    // Create transaction to store hash
    const tx = lucid
      .newTx()
      .pay.ToAddress(
        config.contractAddress,
        { lovelace: NoTamperData_CONSTANTS.CONTRACT_UTXO_AMOUNT }
      )
      .attachMetadata(NoTamperData_CONSTANTS.METADATA_LABEL, txMetadata);
    
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
    console.error('💥 Error storing hash on blockchain:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 STORE HASH - Contract-based endpoint');
    
    // Parse and validate request
    const requestData = await request.json();
    console.log('✅ Request validation passed');

    const { hash, metadata } = requestData;

    if (!hash) {
      console.error('❌ Hash missing from request');
      return NextResponse.json(
        { error: 'Hash is required' },
        { status: 400 }
      );
    }

    if (!metadata || !metadata.formId || !metadata.responseId) {
      console.error('❌ Missing required metadata fields');
      return NextResponse.json(
        { error: 'Missing required metadata fields (formId, responseId)' },
        { status: 400 }
      );
    }

    // Validate hash format (should be 64-character hex string)
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      console.error('❌ Invalid hash format');
      return NextResponse.json(
        { error: 'Invalid hash format. Expected 64-character hex string.' },
        { status: 400 }
      );
    }

    console.log(`📋 Storing hash: ${hash.substring(0, 16)}...`);

    // Store hash on blockchain
    const txHash = await storeHashOnBlockchain(hash, metadata);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Hash stored successfully on blockchain',
      transactionHash: txHash,
      network: process.env.CARDANO_NETWORK || 'Preview',
      contractAddress: process.env.CONTRACT_ADDRESS,
      timestamp: new Date().toISOString(),
      blockchainProof: {
        label: NoTamperData_CONSTANTS.METADATA_LABEL,
        hash: hash,
        txHash: txHash
      }
    });

  } catch (error) {
    console.error('💥 API error:', error);
    
    // Enhanced error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to store hash on blockchain', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}