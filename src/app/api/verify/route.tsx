/* eslint-disable @typescript-eslint/no-explicit-any */

// src/app/api/verify/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { getNetworkTypeFromId, networkUrls, resolveBlockfrostProjectId } from '@/lib/contract';

// Blockfrost API interfaces
interface BlockfrostMetadataResponse {
  tx_hash: string;
  json_metadata: BlockfrostMetadataContent;
}

interface BlockfrostMetadataContent {
  hash: string;
  form_id: string;
  response_id?: string;
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
    response_id?: string;
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

// Enhanced fetch with intelligent pagination
async function fetchTransactionMetadata(
  hash: string,
  networkId: number,
  projectId: string,
  maxPages: number = 50 // Configurable limit to prevent infinite loops
): Promise<BlockfrostMetadataResponse[]> {
  if (!projectId) {
    throw new Error('Blockfrost project ID not configured for requested network');
  }

  const blockfrostUrl = getBlockfrostUrl(networkId);
  let page = 1;
  const count = 100; // Blockfrost max page size
  let totalProcessed = 0;
  const allMatches: BlockfrostMetadataResponse[] = [];
  const startTime = Date.now();
  
  console.log(`🔍 Searching for hash on network ID ${networkId}:`, hash);
  console.log('📡 Blockfrost base URL:', blockfrostUrl);

  try {
    while (page <= maxPages) {
      const metadataUrl = `${blockfrostUrl}/metadata/txs/labels/8434?page=${page}&count=${count}&order=desc`;
      
      console.log(`📄 Fetching page ${page}:`, metadataUrl);

      const response = await fetch(metadataUrl, {
        headers: {
          'project_id': projectId,
        },
        next: { revalidate: 60 } // Cache for 1 minute
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`📄 No more metadata found (404 on page ${page})`);
          break;
        }
        throw new Error(`Blockfrost API error: ${response.status} on page ${page}`);
      }

      const data = await response.json();
      totalProcessed += data.length;
      
      console.log(`📄 Page ${page}: Found ${data.length} transactions (total processed: ${totalProcessed})`);
      
      // If no transactions on this page, we've reached the end
      if (data.length === 0) {
        console.log('📄 Empty page encountered, ending search');
        break;
      }

      // Filter for matching hash - KEEP ORIGINAL LOGIC
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

      console.log(`🎯 Page ${page}: Found ${matches.length} matching transactions`);

      // Collect all matches
      allMatches.push(...matches);

      // If we found matches, return them immediately (early exit optimization)
      if (matches.length > 0) {
        const searchTime = Date.now() - startTime;
        console.log(`✅ Found ${matches.length} matching transaction(s) on page ${page} after ${searchTime}ms`);
        console.log(`📊 Search stats: ${totalProcessed} transactions processed across ${page} pages`);
        return allMatches;
      }

      // Continue to next page if we got a full page of results
      if (data.length < count) {
        console.log(`📄 Partial page (${data.length} < ${count}), reached end of data`);
        break;
      }

      page++;
    }

    // If we reach here, no matches were found
    const searchTime = Date.now() - startTime;
    console.log(`❌ Hash not found after searching ${page - 1} pages (${totalProcessed} transactions) in ${searchTime}ms`);
    
    if (page > maxPages) {
      console.warn(`⚠️  Search stopped at maximum page limit (${maxPages})`);
    }
    
    return allMatches; // Return empty array if no matches found

  } catch (error) {
    const searchTime = Date.now() - startTime;
    console.error(`💥 Error fetching metadata after ${searchTime}ms:`, error);
    throw error;
  }
}

// Get transaction details from Blockfrost
async function getTransactionDetails(
  txHash: string,
  networkId: number,
  projectId: string
): Promise<BlockfrostTransactionInfo | null> {
  if (!projectId) {
    throw new Error('Blockfrost project ID not configured for requested network');
  }

  const blockfrostUrl = getBlockfrostUrl(networkId);
  const txUrl = `${blockfrostUrl}/txs/${txHash}`;

  try {
    const response = await fetch(txUrl, {
      headers: {
        'project_id': projectId,
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
    const blockfrostProjectId = resolveBlockfrostProjectId(networkType);
    const networkName = networkId === 1 ? 'Mainnet' : 'Preview Testnet';

    console.log(`🔍 Verifying hash on ${networkName}:`, {
      hash,
      formId,
      responseId,
      networkId
    });

    // Fetch metadata from blockchain with pagination
    const metadataResults = await fetchTransactionMetadata(hash, networkId, blockfrostProjectId);

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

    // Find the most recent matching transaction - KEEP ORIGINAL LOGIC
    let matchingTx: BlockfrostMetadataResponse | null = null;
    let matchedWithoutResponseId = false;
    for (const tx of metadataResults) {
      const metadata = tx.json_metadata;
      
      // Check if all provided parameters match
      const hashMatches = metadata.hash === hash;
      const formIdMatches = !formId || metadata.form_id === formId;
      let responseIdMatches = true;
      let responseIdUnavailable = false;

      if (responseId) {
        if (metadata.response_id) {
          responseIdMatches = metadata.response_id === responseId;
        } else {
          responseIdUnavailable = true;
        }
      }
      
      if (responseIdUnavailable) {
        responseIdMatches = true;
      }

      if (hashMatches && formIdMatches && responseIdMatches) {
        matchingTx = tx;
        matchedWithoutResponseId = Boolean(responseId && responseIdUnavailable);
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
    const txDetails = await getTransactionDetails(matchingTx.tx_hash, networkId, blockfrostProjectId);
    
    // Calculate confirmations if we have block details
    let confirmations = undefined;
    let blockTime = undefined;
    if (txDetails) {
      // Get current block height (this would need another API call in production)
      // For now, we'll just use the block height from the transaction
      confirmations = txDetails.block_height ? 10 : undefined; // Placeholder
      blockTime = txDetails.block_time;
    }

    const successMessageBase = `Hash verified successfully on ${networkName}`;
    const responseIdNotice = matchedWithoutResponseId
      ? ' (response ID metadata unavailable for this record)'
      : '';

    return {
      verified: true,
      message: `${successMessageBase}${responseIdNotice}`,
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