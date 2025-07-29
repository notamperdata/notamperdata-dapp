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
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import dbConnect from '@/lib/mongodb';

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

/**
 * Extract API key from request headers
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  } else if (apiKeyHeader) {
    return apiKeyHeader;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 STORE HASH - Contract-based endpoint with API key validation');
    
    // Connect to database for API key validation
    await dbConnect();

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

    // Extract and validate API key
    const apiKey = extractApiKey(request);
    
    if (!apiKey) {
      console.error('❌ No API key provided');
      return NextResponse.json(
        { 
          error: 'API key is required for storage operations',
          message: 'Provide API key via Authorization header (Bearer token) or X-API-Key header'
        },
        { status: 401 }
      );
    }

    console.log(`🔑 Validating API key: ${apiKey.substring(0, 8)}...`);

    // Validate API key and consume 1 token
    const apiKeyResult = await ApiKeyManager.validateAndConsumeToken(apiKey, 1);
    
    if (!apiKeyResult.valid) {
      console.error(`❌ API key validation failed: ${apiKeyResult.error}`);
      return NextResponse.json(
        { 
          error: 'Invalid or insufficient API key',
          message: apiKeyResult.error
        },
        { status: 401 }
      );
    }

    const remainingTokens = apiKeyResult.remainingTokens!;
    console.log(`✅ API key validated. Remaining tokens: ${remainingTokens}`);

    console.log(`📋 Storing hash: ${hash.substring(0, 16)}...`);

    // Store hash on blockchain
    const txHash = await storeHashOnBlockchain(hash, metadata);

    // Return success response with token information
    return NextResponse.json({
      success: true,
      message: 'Hash stored successfully on blockchain',
      transactionHash: txHash,
      network: process.env.CARDANO_NETWORK || 'Preview',
      contractAddress: process.env.CONTRACT_ADDRESS,
      timestamp: new Date().toISOString(),
      tokenInfo: {
        tokensUsed: 1,
        remainingTokens: remainingTokens
      },
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

/**
 * GET /api/storehash
 * 
 * Returns information about the storage endpoint
 * This endpoint provides documentation for the storage API
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'storehash',
    method: 'POST',
    description: 'Store form response hash on Cardano blockchain',
    authentication: 'Required - API key via Authorization header or X-API-Key header',
    cost: '1 token per request',
    requiredFields: {
      hash: 'string (64-character hex string)',
      metadata: {
        formId: 'string',
        responseId: 'string'
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer {your_api_key}',
      'X-API-Key': '{your_api_key} (alternative to Authorization)'
    },
    response: {
      success: 'boolean',
      transactionHash: 'string',
      network: 'string',
      contractAddress: 'string',
      timestamp: 'string (ISO)',
      tokenInfo: {
        tokensUsed: 'number',
        remainingTokens: 'number'
      },
      blockchainProof: {
        label: 'number',
        hash: 'string',
        txHash: 'string'
      }
    },
    errors: {
      400: 'Bad request - missing or invalid data',
      401: 'Unauthorized - invalid or missing API key',
      500: 'Internal server error - blockchain or system error'
    },
    example: {
      request: {
        hash: 'fbc46b1040a5d7c87d0df464b03581df16b3c39566ba7285509c400cf935e38b',
        metadata: {
          formId: '1FAIpQLSe_test_form_id',
          responseId: 'test_response_123'
        }
      }
    }
  });
}

/**
 * OPTIONS /api/storehash
 * 
 * CORS support for storage endpoint
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    }
  });
}