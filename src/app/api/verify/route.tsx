// src/app/api/verify/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { getNetworkTypeFromId, networkUrls } from '@/lib/contract';

// Configuration
const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID;

// Blockfrost API interfaces
interface BlockfrostMetadataResponse {
  tx_hash: string;
  json_metadata: BlockfrostMetadataContent;
}

interface BlockfrostMetadataContent {
  hash: string;
  form_id: string;
  response_id: string;
  timestamp: number;
  network_id?: number;
  version: string;
}

interface BlockfrostTransactionInfo {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: Array<{
    unit: string;
    quantity: string;
  }>;
  fees: string;
  deposit: string;
  size: number;
  invalid_before: string | null;
  invalid_hereafter: string | null;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

interface VerificationRequest {
  hash: string;
  formId?: string;
  responseId?: string;
  networkId?: number; // Optional, defaults to testnet if not provided
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
    network_id?: number;
    version: string;
  };
  network?: {
    id: number;
    type: string;
    name: string;
  };
  blockchainProof?: {
    label: number;
    txHash: string;
    blockHeight?: number;
    confirmations?: number;
    blockTime?: number;
    explorerUrl?: string;
  };
  error?: string;
}

// Helper function to get Blockfrost URL for a specific network
function getBlockfrostUrl(networkId: number): string {
  const networkType = getNetworkTypeFromId(networkId);
  return networkUrls[networkType];
}

// Helper function to get explorer URL
function getExplorerUrl(txHash: string, networkId: number): string {
  if (networkId === 1) {
    return `https://cardanoscan.io/transaction/${txHash}`;
  }
  return `https://preview.cardanoscan.io/transaction/${txHash}`;
}

// Fetch transaction metadata from Blockfrost
async function fetchTransactionMetadata(
  hash: string,
  networkId: number
): Promise<BlockfrostMetadataResponse[]> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new Error('Blockfrost project ID not configured');
  }

  const blockfrostUrl = getBlockfrostUrl(networkId);
  const metadataUrl = `${blockfrostUrl}/metadata/txs/labels/8434`;
  
  console.log(`🔍 Searching for hash on network ID ${networkId}:`, hash);
  console.log('📡 Blockfrost URL:', metadataUrl);

  try {
    const response = await fetch(metadataUrl, {
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No metadata found for label 8434 on this network');
        return [];
      }
      throw new Error(`Blockfrost API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.length} transactions with metadata label 8434`);
    
    // Filter for matching hash
    const matches = data.filter((item: any) => {
      try {
        const metadata = item.json_metadata;
        return metadata && (
          metadata.hash === hash ||
          metadata['8434']?.hash === hash
        );
      } catch {
        return false;
      }
    });

    console.log(`Found ${matches.length} matching transactions`);
    return matches;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    throw error;
  }
}

// Get transaction details from Blockfrost
async function getTransactionDetails(
  txHash: string,
  networkId: number
): Promise<BlockfrostTransactionInfo | null> {
  if (!BLOCKFROST_PROJECT_ID) {
    throw new Error('Blockfrost project ID not configured');
  }

  const blockfrostUrl = getBlockfrostUrl(networkId);
  const txUrl = `${blockfrostUrl}/txs/${txHash}`;

  try {
    const response = await fetch(txUrl, {
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
      },
      next: { revalidate: 60 } // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`Failed to fetch transaction details: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

// Verify hash on blockchain
async function verifyHashOnBlockchain(
  hash: string,
  formId?: string,
  responseId?: string,
  networkId: number = 0
): Promise<VerificationResult> {
  try {
    // Validate network ID
    if (networkId !== 0 && networkId !== 1) {
      return {
        verified: false,
        message: 'Invalid network ID. Must be 0 (testnet) or 1 (mainnet)',
        error: 'INVALID_NETWORK'
      };
    }

    const networkType = getNetworkTypeFromId(networkId);
    const networkName = networkId === 1 ? 'Mainnet' : 'Preview Testnet';

    console.log(`🔍 Verifying hash on ${networkName}:`, {
      hash,
      formId,
      responseId,
      networkId
    });

    // Fetch metadata from blockchain
    const metadataResults = await fetchTransactionMetadata(hash, networkId);

    if (metadataResults.length === 0) {
      // If not found on specified network, provide helpful message
      return {
        verified: false,
        message: `Hash not found on ${networkName}. Please check if the hash was stored on the correct network.`,
        network: {
          id: networkId,
          type: networkType,
          name: networkName
        },
        error: 'NOT_FOUND'
      };
    }

    // Find the most recent matching transaction
    let matchingTx = null;
    for (const tx of metadataResults) {
      const metadata = tx.json_metadata;
      
      // Check if all provided parameters match
      const hashMatches = metadata.hash === hash;
      const formIdMatches = !formId || metadata.form_id === formId;
      const responseIdMatches = !responseId || metadata.response_id === responseId;
      
      if (hashMatches && formIdMatches && responseIdMatches) {
        matchingTx = tx;
        break;
      }
    }

    if (!matchingTx) {
      return {
        verified: false,
        message: 'Hash found but form ID or response ID does not match',
        network: {
          id: networkId,
          type: networkType,
          name: networkName
        },
        error: 'MISMATCH'
      };
    }

    // Get additional transaction details
    const txDetails = await getTransactionDetails(matchingTx.tx_hash, networkId);
    
    // Calculate confirmations if we have block details
    let confirmations = undefined;
    let blockTime = undefined;
    if (txDetails) {
      // Get current block height (this would need another API call in production)
      // For now, we'll just use the block height from the transaction
      confirmations = txDetails.block_height ? 10 : undefined; // Placeholder
      blockTime = txDetails.block_time;
    }

    return {
      verified: true,
      message: `Hash verified successfully on ${networkName}`,
      transactionHash: matchingTx.tx_hash,
      metadata: {
        hash: matchingTx.json_metadata.hash,
        form_id: matchingTx.json_metadata.form_id,
        response_id: matchingTx.json_metadata.response_id,
        timestamp: matchingTx.json_metadata.timestamp,
        network_id: matchingTx.json_metadata.network_id,
        version: matchingTx.json_metadata.version
      },
      network: {
        id: networkId,
        type: networkType,
        name: networkName
      },
      blockchainProof: {
        label: 8434,
        txHash: matchingTx.tx_hash,
        blockHeight: txDetails?.block_height,
        confirmations,
        blockTime,
        explorerUrl: getExplorerUrl(matchingTx.tx_hash, networkId)
      }
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      verified: false,
      message: 'Error verifying hash on blockchain',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

// API Route Handlers
export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    
    if (!body.hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hash is required'
        },
        { status: 400 }
      );
    }

    // Get network ID from request or default to testnet (0)
    const networkId = body.networkId ?? 0;
    
    const result = await verifyHashOnBlockchain(
      body.hash,
      body.formId,
      body.responseId,
      networkId
    );

    // Format response based on verification result
    if (result.verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          message: result.message,
          transactionHash: result.transactionHash,
          metadata: result.metadata,
          network: result.network,
          blockchainProof: result.blockchainProof
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        message: result.message,
        network: result.network,
        error: result.error
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify hash',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for verification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    const formId = searchParams.get('formId');
    const responseId = searchParams.get('responseId');
    const networkId = parseInt(searchParams.get('networkId') || '0');

    if (!hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hash parameter is required'
        },
        { status: 400 }
      );
    }

    const result = await verifyHashOnBlockchain(
      hash,
      formId || undefined,
      responseId || undefined,
      networkId
    );

    if (result.verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        data: {
          message: result.message,
          transactionHash: result.transactionHash,
          metadata: result.metadata,
          network: result.network,
          blockchainProof: result.blockchainProof
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        message: result.message,
        network: result.network,
        error: result.error
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify hash',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}