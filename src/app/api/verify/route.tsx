// src/app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Configuration
const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;
const CARDANO_NETWORK = (process.env.CARDANO_NETWORK as 'Preview' | 'Preprod' | 'Mainnet') || 'Preview';

// Network configuration
const networkUrls = {
  Preview: 'https://cardano-preview.blockfrost.io/api/v0',
  Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
  Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0'
};

interface BlockfrostMetadataResponse {
  tx_hash: string;
  json_metadata: BlockfrostMetadataContent;
}

interface BlockfrostMetadataContent {
  hash: string;
  form_id: string;
  response_id: string;
  timestamp: number;
  version: string;
}

interface VerificationResult {
  verified: boolean;
  message: string;
  transactionHash?: string;
  metadata?: {
    hash: string;
    form_id: string;
    response_id: string;
    timestamp: number;
    version: string;
  };
  network?: string;
  blockchainProof?: {
    label: number;
    txHash: string;
    blockHeight?: number;
    confirmations?: number;
  };
}

interface TransactionDetails {
  block_height: number;
  height: number;
}

// Verify hash on blockchain using Blockfrost metadata queries
async function verifyHashOnBlockchain(hash: string): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying hash on blockchain:', hash.substring(0, 16) + '...');
    
    if (!BLOCKFROST_PROJECT_ID) {
      throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
    }
    
    const blockfrostUrl = networkUrls[CARDANO_NETWORK];
    
    // Query metadata transactions with label 8434 (notamperdata label)
    const metadataUrl = `${blockfrostUrl}/metadata/txs/labels/8434`;
    console.log('🌐 Querying metadata from:', metadataUrl);
    
    const response = await fetch(metadataUrl, {
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Blockfrost API error:', response.status, errorText);
      throw new Error(`Blockfrost API error: ${response.status} - ${errorText}`);
    }
    
    const transactions: BlockfrostMetadataResponse[] = await response.json();
    console.log('📊 Found transactions with metadata:', transactions.length);
    
    // Log all metadata for debugging
    console.log('🔍 DEBUG: All transactions metadata:');
    transactions.forEach((tx, index) => {
      console.log(`Transaction ${index + 1}:`, {
        tx_hash: tx.tx_hash,
        json_metadata: tx.json_metadata
      });
      
      // The metadata is directly in json_metadata when querying by label
      console.log(`  - Hash in metadata:`, tx.json_metadata.hash);
    });
    
    console.log('🎯 Looking for hash:', hash);
    
    // Find matching transaction by hash
    const matchingTx = transactions.find(tx => {
      // The metadata is directly in json_metadata when querying by label
      const notamperdataMetadata = tx.json_metadata;
      console.log('🔍 Checking transaction:', tx.tx_hash, 'metadata:', notamperdataMetadata);
      return notamperdataMetadata && notamperdataMetadata.hash === hash;
    });
    
    if (!matchingTx) {
      console.log('❌ Hash not found on blockchain');
      return {
        verified: false,
        message: 'Hash not found on blockchain',
        network: CARDANO_NETWORK
      };
    }
    
    console.log('✅ Hash verified on blockchain!');
    console.log('🔗 Transaction hash:', matchingTx.tx_hash);
    
    const notamperdataMetadata = matchingTx.json_metadata;
    
    // Get additional transaction details for proof
    let blockHeight: number | undefined;
    let confirmations: number | undefined;
    
    try {
      const txDetailsUrl = `${blockfrostUrl}/txs/${matchingTx.tx_hash}`;
      const txDetailsResponse = await fetch(txDetailsUrl, {
        headers: {
          'project_id': BLOCKFROST_PROJECT_ID
        }
      });
      
      if (txDetailsResponse.ok) {
        const txDetails: TransactionDetails = await txDetailsResponse.json();
        blockHeight = txDetails.block_height;
        
        // Get current tip to calculate confirmations - only if blockHeight is defined
        if (blockHeight !== undefined) {
          const tipResponse = await fetch(`${blockfrostUrl}/blocks/latest`, {
            headers: {
              'project_id': BLOCKFROST_PROJECT_ID
            }
          });
          
          if (tipResponse.ok) {
            const tipData: TransactionDetails = await tipResponse.json();
            confirmations = tipData.height - blockHeight + 1;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch additional transaction details:', error);
    }
    
    return {
      verified: true,
      message: 'Hash successfully verified on blockchain',
      transactionHash: matchingTx.tx_hash,
      metadata: {
        hash: notamperdataMetadata.hash,
        form_id: notamperdataMetadata.form_id,
        response_id: notamperdataMetadata.response_id,
        timestamp: notamperdataMetadata.timestamp,
        version: notamperdataMetadata.version
      },
      network: CARDANO_NETWORK,
      blockchainProof: {
        label: 8434,
        txHash: matchingTx.tx_hash,
        blockHeight,
        confirmations
      }
    };
    
  } catch (error) {
    console.error('💥 Error verifying hash on blockchain:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  console.log("🔍 VERIFY HASH - Contract-based endpoint");
  
  try {
    const body = await request.json();
    const { hash } = body;
    
    // Validate required fields
    if (!hash) {
      console.log('❌ Missing hash in request');
      return NextResponse.json(
        { error: 'Missing required field: hash' },
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
    
    console.log('🔍 Verifying hash:', hash.substring(0, 16) + '...');
    
    // Verify hash on blockchain
    const verificationResult = await verifyHashOnBlockchain(hash);
    
    // Return verification result
    return NextResponse.json(verificationResult);
    
  } catch (error) {
    console.error('💥 API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message?.includes('BLOCKFROST')) {
        return NextResponse.json(
          { 
            verified: false,
            error: 'Blockchain connection error. Please check Blockfrost configuration.',
            details: error.message 
          },
          { status: 500 }
        );
      }
      
      if (error.message?.includes('rate limit')) {
        return NextResponse.json(
          { 
            verified: false,
            error: 'Rate limit exceeded. Please try again later.',
            details: error.message 
          },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        verified: false,
        error: 'Internal server error while verifying hash on blockchain',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET requests for direct hash verification via URL parameters
export async function GET(request: NextRequest) {
  console.log("🔍 VERIFY HASH - GET request");
  
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    
    if (!hash) {
      return NextResponse.json(
        { error: 'Missing hash parameter' },
        { status: 400 }
      );
    }
    
    // Validate hash format
    if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
      return NextResponse.json(
        { error: 'Invalid hash format. Expected 64-character hex string.' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Verifying hash via GET:', hash.substring(0, 16) + '...');
    
    // Verify hash on blockchain
    const verificationResult = await verifyHashOnBlockchain(hash);
    
    // Return verification result
    return NextResponse.json(verificationResult);
    
  } catch (error) {
    console.error('💥 GET API error:', error);
    
    return NextResponse.json(
      { 
        verified: false,
        error: 'Internal server error while verifying hash',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}