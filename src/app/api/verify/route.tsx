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
  json_metadata: {
    [key: string]: any;
  };
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

// Verify hash by querying Blockfrost for metadata with label 8434
async function verifyHashOnBlockchain(hash: string): Promise<VerificationResult> {
  try {
    console.log('🔍 Verifying hash on blockchain:', hash);
    
    if (!BLOCKFROST_PROJECT_ID) {
      throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
    }
    
    const blockfrostUrl = networkUrls[CARDANO_NETWORK];
    
    // Query Blockfrost for metadata transactions with label 8434 (ADAV label)
    const metadataUrl = `${blockfrostUrl}/metadata/txs/labels/8434`;
    
    console.log('📡 Querying Blockfrost:', metadataUrl);
    
    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Blockfrost API error:', response.status, errorText);
      
      if (response.status === 404) {
        return {
          verified: false,
          message: 'No transactions found with Adaverc metadata label (8434)',
          network: CARDANO_NETWORK
        };
      }
      
      throw new Error(`Blockfrost API error: ${response.status} - ${errorText}`);
    }
    
    const transactions: BlockfrostMetadataResponse[] = await response.json();
    
    console.log(`📄 Found ${transactions.length} transactions with label 8434`);
    
    // Search for matching hash in transaction metadata
    const matchingTx = transactions.find(tx => {
      const adavercMetadata = tx.json_metadata['8434'];
      return adavercMetadata && adavercMetadata.hash === hash;
    });
    
    if (!matchingTx) {
      console.log('❌ Hash not found in blockchain metadata');
      return {
        verified: false,
        message: 'Hash not found in blockchain records',
        network: CARDANO_NETWORK
      };
    }
    
    console.log('✅ Hash verified on blockchain!');
    console.log('🔗 Transaction hash:', matchingTx.tx_hash);
    
    const adavercMetadata = matchingTx.json_metadata['8434'];
    
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
        const txDetails = await txDetailsResponse.json();
        blockHeight = txDetails.block_height;
        
        // Get current tip to calculate confirmations
        const tipResponse = await fetch(`${blockfrostUrl}/blocks/latest`, {
          headers: {
            'project_id': BLOCKFROST_PROJECT_ID
          }
        });
        
        if (tipResponse.ok) {
          const tipData = await tipResponse.json();
          confirmations = tipData.height - blockHeight + 1;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch additional transaction details:', error);
    }
    
    return {
      verified: true,
      message: 'Hash successfully verified on blockchain',
      transactionHash: matchingTx.tx_hash,
      metadata: adavercMetadata,
      network: CARDANO_NETWORK,
      blockchainProof: {
        label: 8434,
        txHash: matchingTx.tx_hash,
        blockHeight,
        confirmations
      }
    };
    
  } catch (error: any) {
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
    
  } catch (error: any) {
    console.error('💥 API error:', error);
    
    // Handle specific error types
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
    
    return NextResponse.json(
      { 
        verified: false,
        error: 'Internal server error while verifying hash on blockchain',
        message: error.message || 'Unknown error'
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
    
  } catch (error: any) {
    console.error('💥 GET API error:', error);
    
    return NextResponse.json(
      { 
        verified: false,
        error: 'Internal server error while verifying hash',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}