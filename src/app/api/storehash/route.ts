/* eslint-disable @typescript-eslint/no-explicit-any */

// src/app/api/storehash/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AccessTokenManager } from '@/lib/AccessTokenManager';
import dbConnect from '@/lib/mongodb';
import { 
  Lucid, 
  Blockfrost, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { 
  loadContractConfig,
  networkUrls,
  getNetworkTypeFromId as getContractNetworkType,
  getLucidNetworkType,
  NoTamperData_CONSTANTS
} from '@/lib/contract';
import { paymentUtils } from '@/lib/paymentConfig';

// Fix BigInt serialization for JSON responses
if (typeof BigInt !== 'undefined') {
  (BigInt.prototype as any).toJSON = function() { return this.toString(); };
}

// Environment validation at startup
const ENV_VALIDATION = {
  BLOCKFROST_PROJECT_ID: process.env.BLOCKFROST_PROJECT_ID,
  PLATFORM_WALLET_MNEMONIC: process.env.PLATFORM_WALLET_MNEMONIC,
  MONGODB_URI: process.env.MONGODB_URI
};

console.log('🔧 Environment variables check:', {
  hasBlockfrost: !!ENV_VALIDATION.BLOCKFROST_PROJECT_ID,
  hasWallet: !!ENV_VALIDATION.PLATFORM_WALLET_MNEMONIC,
  hasMongoDB: !!ENV_VALIDATION.MONGODB_URI
});

interface StoreHashRequest {
  hash: string;
  metadata?: any;
  formId?: string;
  responseId?: string;
  networkId?: number;
}

interface StoreHashResponse {
  success: boolean;
  data?: {
    transactionHash: string;
    hash: string;
    formId?: string;
    responseId?: string;
    network: {
      id: number;
      name: string;
      isMainnet: boolean;
    };
    timestamp: string;
    remainingTokens: number;
    blockchainExplorer: string;
    blockchainProof: {
      label: number;
      hash: string;
      txHash: string;
    };
    platformAddress: string; // Changed from contractAddress to reflect new architecture
  };
  error?: string;
  message?: string;
}

/**
 * Extract access token from Authorization header (Bearer token)
 */
function extractAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return token || null;
  }
  return null;
}

/**
 * Validate access token format
 */
function isValidAccessTokenFormat(accessToken: string): boolean {
  return /^ak_[a-zA-Z0-9]{16}$/.test(accessToken);
}

/**
 * Get network type from network ID
 */
function getNetworkTypeFromId(networkId: number): string {
  return networkId === 1 ? 'mainnet' : 'testnet';
}

/**
 * Get blockchain explorer URL for transaction
 */
function getBlockchainExplorerUrl(txHash: string, networkId: number): string {
  if (networkId === 1) {
    return `https://cardanoscan.io/transaction/${txHash}`;
  } else {
    return `https://preview.cardanoscan.io/transaction/${txHash}`;
  }
}

/**
 * Initialize Lucid for platform wallet self-send transactions
 * Updated: No longer needs contract validator loading
 */
async function initLucid(networkId: number): Promise<LucidEvolution> {
  const config = loadContractConfig(networkId);
  
  console.log('🔧 Initializing Lucid for self-send architecture:', {
    hasBlockfrostId: !!config.blockfrostProjectId,
    hasWalletMnemonic: !!config.platformWalletMnemonic,
    networkType: config.networkType
  });

  const network = getLucidNetworkType(config.networkType);
  const blockfrostUrl = networkUrls[config.networkType];

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, config.blockfrostProjectId),
    network
  );

  // Select platform wallet from mnemonic
  lucid.selectWallet.fromSeed(config.platformWalletMnemonic);

  return lucid;
}

/**
 * Store hash on blockchain using platform wallet self-send with metadata
 * Updated: Uses platform address instead of contract address for cost efficiency
 */
async function storeHashOnBlockchain(
  hash: string, 
  metadata: { formId?: string; responseId?: string; networkId: number }
): Promise<string> {
  try {
    console.log('🚀 Storing hash via platform wallet self-send:', hash);
    
    // Initialize Lucid with network ID
    const lucid = await initLucid(metadata.networkId);
    
    // Get platform address for self-send transaction (not contract address)
    const platformAddress = paymentUtils.getPlatformAddress(metadata.networkId);
    console.log('📋 Using platform address for self-send:', platformAddress);
    
    // Create transaction metadata according to specification (label 8434)
    const txMetadata = {
      hash: hash,
      form_id: metadata.formId || 'unknown',
      response_id: metadata.responseId || 'unknown',
      timestamp: Date.now(),
      network_id: metadata.networkId,
      version: "1.0",
      architecture: "self-send" // Indicates new cost-efficient architecture
    };
    
    console.log('📝 Transaction metadata:', txMetadata);
    
    // Create self-send transaction with metadata
    // Platform wallet sends to itself to maintain capital efficiency while storing metadata
    const tx = lucid
      .newTx()
      .pay.ToAddress(
        platformAddress, // Self-send to platform address 
        { lovelace: BigInt(2_000_000) } // Minimum UTxO amount, stays in platform wallet
      )
      .attachMetadata(NoTamperData_CONSTANTS.METADATA_LABEL, txMetadata);
    
    console.log('⚙️ Building self-send transaction...');
    
    // Complete and sign transaction
    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign.withWallet().complete();
    
    console.log('📤 Submitting self-send transaction...');
    
    // Submit transaction
    const txHash = await signedTx.submit();
    
    console.log('✅ Hash stored via self-send transaction! TX:', txHash);
    
    return txHash;
    
  } catch (error) {
    console.error('💥 Error storing hash via self-send:', error);
    throw error;
  }
}

/**
 * POST /api/storehash
 * 
 * Store hash on blockchain using platform wallet self-send architecture
 * Updated: More cost-efficient approach with same immutable proof capabilities
 */
export async function POST(request: NextRequest): Promise<NextResponse<StoreHashResponse>> {
  try {
    console.log('🔐 Store Hash - Processing request with self-send blockchain integration');

    // Parse request body
    const body: StoreHashRequest = await request.json();
    
    // Extract access token from Authorization header
    const accessToken = extractAccessToken(request);
    
    // Validate access token presence
    if (!accessToken) {
      console.error('❌ No access token provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access token is required. Provide via Authorization header: Bearer {accessToken}' 
        },
        { status: 401 }
      );
    }

    // Validate access token format
    if (!isValidAccessTokenFormat(accessToken)) {
      console.error('❌ Invalid access token format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid access token format. Expected format: ak_[16 alphanumeric characters]' 
        },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!body.hash) {
      console.error('❌ Hash missing from request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Hash is required' 
        },
        { status: 400 }
      );
    }

    // Validate hash format (64 character hex string)
    if (!/^[a-fA-F0-9]{64}$/.test(body.hash)) {
      console.error('❌ Invalid hash format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid hash format. Expected 64 hexadecimal characters.' 
        },
        { status: 400 }
      );
    }

    // Get network ID from request (default to testnet)
    const networkId = body.networkId ?? 0;
    console.log('📡 Processing request for network ID:', networkId);
    
    // Validate network ID
    if (networkId !== 0 && networkId !== 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid network ID. Must be 0 (testnet) or 1 (mainnet)' 
        },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    console.log(`🔍 Validating access token: ${accessToken.substring(0, 8)}...`);
    
    // Validate access token without consuming tokens
    const validationResult = await AccessTokenManager.validateAndConsumeToken(accessToken, 0);
    
    if (!validationResult.valid) {
      console.error(`❌ Access token validation failed: ${validationResult.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.error || 'Invalid access token' 
        },
        { status: 401 }
      );
    }
    
    // Get access token status to check remaining tokens
    const statusResult = await AccessTokenManager.getAccessTokenStatus(accessToken);
    
    if (!statusResult.success || !statusResult.data) {
      console.error('❌ Failed to retrieve access token status');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve access token status' 
        },
        { status: 500 }
      );
    }
    
    if (statusResult.data.remainingTokens <= 0) {
      console.error('❌ Insufficient tokens');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient tokens. Please purchase more tokens to continue.' 
        },
        { status: 402 }
      );
    }
    
    console.log(`✅ Access token valid. Remaining tokens: ${statusResult.data.remainingTokens}`);
    
    // Store hash on blockchain using self-send architecture
    console.log('🔗 Storing hash via platform wallet self-send...');
    const txHash = await storeHashOnBlockchain(body.hash, {
      formId: body.formId,
      responseId: body.responseId,
      networkId
    });
    
    console.log(`✅ Hash stored via self-send. Transaction: ${txHash}`);
    
    // Consume token after successful blockchain storage
    const consumeResult = await AccessTokenManager.validateAndConsumeToken(accessToken, 1);
    
    if (!consumeResult.valid) {
      console.warn('⚠️ Failed to consume token after blockchain storage:', consumeResult.error);
      // Transaction was successful, but token consumption failed
      // This is logged but doesn't fail the request since the hash is already stored
    } else {
      console.log(`✅ Token consumed. Remaining: ${consumeResult.remainingTokens}`);
    }
    
    // Get network name for response
    const networkType = getNetworkTypeFromId(networkId);
    
    // Get platform address for response
    const platformAddress = paymentUtils.getPlatformAddress(networkId);
    
    // Return success response with transaction details
    return NextResponse.json({
      success: true,
      data: {
        transactionHash: txHash,
        hash: body.hash,
        formId: body.formId,
        responseId: body.responseId,
        network: {
          id: networkId,
          name: networkType,
          isMainnet: networkId === 1
        },
        timestamp: new Date().toISOString(),
        remainingTokens: consumeResult.remainingTokens ?? (statusResult.data.remainingTokens - 1),
        blockchainExplorer: getBlockchainExplorerUrl(txHash, networkId),
        blockchainProof: {
          label: NoTamperData_CONSTANTS.METADATA_LABEL,
          hash: body.hash,
          txHash: txHash
        },
        platformAddress // Return platform address instead of contract address
      }
    });

  } catch (error) {
    console.error('💥 Store hash error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while storing hash', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storehash
 * 
 * Returns information about the store hash endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'storehash',
    method: 'POST',
    description: 'Store hash on Cardano blockchain using platform wallet self-send architecture',
    architecture: 'Platform wallet self-send with metadata for cost efficiency',
    authentication: {
      methods: ['Authorization: Bearer {accessToken}'],
      format: 'ak_[16 alphanumeric characters]'
    },
    requiredFields: ['hash'],
    optionalFields: ['metadata', 'formId', 'responseId', 'networkId'],
    networkIds: {
      0: 'testnet',
      1: 'mainnet'
    },
    hashFormat: '64 hexadecimal characters',
    costPerHash: '1 token',
    blockchainIntegration: {
      platform: 'Cardano',
      architecture: 'Self-send transactions with metadata',
      metadataLabel: NoTamperData_CONSTANTS.METADATA_LABEL,
      costEfficiency: 'Only transaction fees, no capital lockup'
    },
    response: {
      success: 'boolean',
      data: {
        transactionHash: 'string',
        hash: 'string',
        network: 'object',
        timestamp: 'string',
        remainingTokens: 'number',
        blockchainExplorer: 'string',
        blockchainProof: 'object',
        platformAddress: 'string'
      }
    }
  });
}

/**
 * OPTIONS /api/storehash
 * 
 * CORS support for store hash endpoint
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-access-token'
    }
  });
}