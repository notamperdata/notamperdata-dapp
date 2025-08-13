// src/app/api/storehash/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  Lucid, 
  Blockfrost, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { 
  initializeLucid,
  getContractAddress,
  getNetworkTypeFromId,
  networkUrls,
  getLucidNetworkType,
  loadNoTamperDataValidator,
  NoTamperData_CONSTANTS
} from '@/lib/contract';
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import dbConnect from '@/lib/mongodb';

// Initialize Lucid with dynamic network support
async function initLucidForNetwork(networkId: number): Promise<LucidEvolution> {
  try {
    // Initialize with the provided network ID
    const lucid = await initializeLucid(
      networkId,
      process.env.BLOCKFROST_PROJECT_ID,
      process.env.PLATFORM_WALLET_MNEMONIC
    );
    
    console.log('✅ Lucid initialized for network ID:', networkId);
    return lucid;
  } catch (error) {
    console.error('Failed to initialize Lucid:', error);
    throw error;
  }
}

// Interface for request body
interface StoreHashRequest {
  hash: string;
  formId: string;
  responseId: string;
  apiKey: string;
  networkId?: number; // Optional, defaults to testnet if not provided
}

// Interface for metadata
interface StoreMetadata {
  formId: string;
  responseId: string;
  networkId: number;
}

// Store hash on blockchain with metadata
async function storeHashOnBlockchain(
  hash: string, 
  metadata: StoreMetadata
): Promise<string> {
  try {
    console.log('🚀 Storing hash on blockchain:', {
      hash,
      networkId: metadata.networkId,
      formId: metadata.formId
    });
    
    // Initialize Lucid with the specified network
    const lucid = await initLucidForNetwork(metadata.networkId);
    
    // Load validator (for future use if needed)
    const networkType = getNetworkTypeFromId(metadata.networkId);
    const validator = loadNoTamperDataValidator(networkType);
    console.log('📜 Validator loaded for network:', networkType, 'hash:', validator.hash);
    
    // Get contract address for the specific network
    const contractAddress = getContractAddress(metadata.networkId);
    console.log('📋 Using contract address:', contractAddress);
    
    // Validate that the contract address matches the network
    const isMainnet = metadata.networkId === 1;
    const isValidAddress = isMainnet 
      ? contractAddress.startsWith('addr1')
      : contractAddress.startsWith('addr_test1');
    
    if (!isValidAddress) {
      throw new Error(`Contract address ${contractAddress} doesn't match network ID ${metadata.networkId}`);
    }
    
    // Create transaction metadata according to specification (label 8434)
    const txMetadata = {
      hash: hash,
      form_id: metadata.formId,
      response_id: metadata.responseId,
      timestamp: Date.now(),
      network_id: metadata.networkId,
      version: "1.0"
    };
    
    console.log('📝 Transaction metadata:', txMetadata);
    
    // Create transaction to store hash
    const tx = lucid
      .newTx()
      .pay.ToAddress(
        contractAddress,
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
    console.log('📋 Transaction hash:', txHash);
    
    return txHash;
  } catch (error) {
    console.error('❌ Failed to store hash on blockchain:', error);
    throw error;
  }
}

// API Route Handler
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: StoreHashRequest = await request.json();
    
    // Validate required fields
    if (!body.hash || !body.formId || !body.responseId || !body.apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: hash, formId, responseId, and apiKey are required' 
        },
        { status: 400 }
      );
    }
    
    // Get network ID from request or default to testnet (0)
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
    
    // Verify API key and check remaining tokens
    const validationResult = await ApiKeyManager.validateAndConsumeToken(body.apiKey, 0);
    
    // First check if the API key is valid without consuming tokens
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.error || 'Invalid API key' 
        },
        { status: 401 }
      );
    }
    
    // Get the API key status to check remaining tokens
    const statusResult = await ApiKeyManager.getApiKeyStatus(body.apiKey);
    
    if (!statusResult.success || !statusResult.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve API key status' 
        },
        { status: 500 }
      );
    }
    
    if (statusResult.data.remainingTokens <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient tokens. Please purchase more tokens to continue.' 
        },
        { status: 402 }
      );
    }
    
    // Store hash on blockchain with network-specific configuration
    const txHash = await storeHashOnBlockchain(body.hash, {
      formId: body.formId,
      responseId: body.responseId,
      networkId
    });
    
    // Now consume the token after successful blockchain storage
    const consumeResult = await ApiKeyManager.validateAndConsumeToken(body.apiKey, 1);
    
    if (!consumeResult.valid) {
      console.warn('Failed to consume token after blockchain storage:', consumeResult.error);
      // Transaction was successful, but token consumption failed
      // This is logged but doesn't fail the request since the hash is already stored
    }
    
    // Get network name for response
    const networkType = getNetworkTypeFromId(networkId);
    
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
        blockchainExplorer: networkId === 1
          ? `https://cardanoscan.io/transaction/${txHash}`
          : `https://preview.cardanoscan.io/transaction/${txHash}`
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('BLOCKFROST_PROJECT_ID')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Server configuration error. Please contact support.' 
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('PLATFORM_WALLET_MNEMONIC')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Platform wallet not configured. Please contact support.' 
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('Contract address')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Contract not deployed on the specified network' 
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Network')) {
        return NextResponse.json(
          { 
            success: false, 
            error: error.message 
          },
          { status: 400 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to store hash on blockchain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method to check API status
export async function GET(request: NextRequest) {
  try {
    // Get network ID from query params
    const { searchParams } = new URL(request.url);
    const networkId = parseInt(searchParams.get('networkId') || '0');
    
    // Validate network ID
    if (networkId !== 0 && networkId !== 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid network ID' 
        },
        { status: 400 }
      );
    }
    
    // Get network information
    const networkType = getNetworkTypeFromId(networkId);
    const contractAddress = getContractAddress(networkId);
    
    return NextResponse.json({
      success: true,
      service: 'NoTamperData Hash Storage API',
      version: '1.0.0',
      network: {
        id: networkId,
        type: networkType,
        name: networkId === 1 ? 'Mainnet' : 'Preview Testnet',
        contractAddress: contractAddress
      },
      endpoints: {
        store: '/api/storehash',
        verify: '/api/verify'
      },
      requiredFields: {
        POST: ['hash', 'formId', 'responseId', 'apiKey'],
        optionalFields: ['networkId']
      },
      documentation: 'https://docs.notamperdata.com/api'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Service information unavailable' 
      },
      { status: 500 }
    );
  }
}