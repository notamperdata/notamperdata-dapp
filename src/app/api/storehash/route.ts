/* eslint-disable @typescript-eslint/no-explicit-any */

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
  getLucidNetworkType,
  NoTamperData_CONSTANTS
} from '@/lib/contract';
import { paymentUtils } from '@/lib/paymentConfig';

const safeBigIntStringify = (obj: any): string => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
};


interface StoreHashRequest {
  hash: string;
  metadata?: any;
  formId?: string;
  networkId?: number;
}

interface StoreHashResponse {
  success: boolean;
  data?: {
    transactionHash: string;
    hash: string;
    formId?: string;
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
    platformAddress: string;
  };
  error?: string;
  message?: string;
}

function extractAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return token || null;
  }
  return null;
}

function isValidAccessTokenFormat(accessToken: string): boolean {
  return /^ak_[a-zA-Z0-9]{16}$/.test(accessToken);
}

function getNetworkTypeFromId(networkId: number): string {
  return networkId === 1 ? 'mainnet' : 'testnet';
}

function getBlockchainExplorerUrl(txHash: string, networkId: number): string {
  if (networkId === 1) {
    return `https://cardanoscan.io/transaction/${txHash}`;
  } else {
    return `https://preview.cardanoscan.io/transaction/${txHash}`;
  }
}

async function initLucid(networkId: number): Promise<LucidEvolution> {
  const config = loadContractConfig(networkId);
  const network = getLucidNetworkType(config.networkType);
  const blockfrostUrl = networkUrls[config.networkType];

  const lucid = await Lucid(
    new Blockfrost(blockfrostUrl, config.blockfrostProjectId),
    network
  );

  lucid.selectWallet.fromSeed(config.platformWalletMnemonic);
  return lucid;
}

async function storeHashOnBlockchain(
  hash: string, 
  metadata: { formId?: string; networkId: number }
): Promise<string> {
  try {
    const lucid = await initLucid(metadata.networkId);
    const platformAddress = paymentUtils.getPlatformAddress(metadata.networkId);
    
    const txMetadata = {
      hash: hash,
      form_id: metadata.formId || 'unknown',
      timestamp: Date.now(),
      network_id: metadata.networkId,
      version: "1.0"
    };
    
    const tx = lucid
      .newTx()
      .pay.ToAddress(
        platformAddress,
        { lovelace: BigInt(2_000_000) }
      )
      .attachMetadata(NoTamperData_CONSTANTS.METADATA_LABEL, txMetadata);
    
    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign.withWallet().complete();
    const txHash = await signedTx.submit();
    
    return txHash;
    
  } catch (error) {
    console.error('Error storing hash via self-send:', error);
    throw error;
  }
}

async function handleHashStorage(request: NextRequest): Promise<NextResponse<StoreHashResponse>> {
  const startTime = Date.now();
  
  try {
    let body: StoreHashRequest;
    
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      
      const hash = searchParams.get('hash');
      const formId = searchParams.get('formId');
      const networkId = parseInt(searchParams.get('networkId') || '0');
      
      if (!hash) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Hash parameter is required for GET request' 
          },
          { status: 400 }
        );
      }
      
      body = {
        hash,
        formId: formId || undefined,
        networkId,
        metadata: {
          formId,
          method: 'GET',
          timestamp: Date.now()
        }
      };
      
    } else {
      body = await request.json();
    }
    
    const accessToken = extractAccessToken(request);
    
    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access token is required. Provide via Authorization header: Bearer {accessToken}' 
        },
        { status: 401 }
      );
    }

    if (!isValidAccessTokenFormat(accessToken)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid access token format. Expected format: ak_[16 alphanumeric characters]' 
        },
        { status: 401 }
      );
    }

    if (!body.hash) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Hash is required' 
        },
        { status: 400 }
      );
    }

    if (!/^[a-fA-F0-9]{64}$/.test(body.hash)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid hash format. Expected 64 hexadecimal characters.' 
        },
        { status: 400 }
      );
    }

    const networkId = body.networkId ?? 0;
    
    if (networkId !== 0 && networkId !== 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid network ID. Must be 0 (testnet) or 1 (mainnet)' 
        },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    const validationResult = await AccessTokenManager.validateAndConsumeToken(accessToken, 0);
    
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.error || 'Invalid access token' 
        },
        { status: 401 }
      );
    }
    
    const statusResult = await AccessTokenManager.getAccessTokenStatus(accessToken);
    
    if (!statusResult.success || !statusResult.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve access token status' 
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
    
    const txHash = await storeHashOnBlockchain(body.hash, {
      formId: body.formId,
      networkId
    });
    
    const consumeResult = await AccessTokenManager.validateAndConsumeToken(accessToken, 1);
    
    if (!consumeResult.valid) {
      console.warn('Failed to consume token after blockchain storage:', consumeResult.error);
    }
    
    const networkType = getNetworkTypeFromId(networkId);
    const platformAddress = paymentUtils.getPlatformAddress(networkId);
    
    const responseData = {
      success: true,
      data: {
        transactionHash: txHash,
        hash: body.hash,
        formId: body.formId,
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
        platformAddress
      }
    };
    
    return new NextResponse(safeBigIntStringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Store hash error:', error);
    
    const elapsedTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    const errorResponse = { 
      success: false,
      error: 'Internal server error while storing hash', 
      message: errorMessage,
      elapsedTime: `${elapsedTime}ms`
    };
    
    return new NextResponse(safeBigIntStringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<StoreHashResponse>> {
  return handleHashStorage(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');
  
  if (hash) {
    return handleHashStorage(request);
  }
  
  const infoData = {
    endpoint: 'storehash',
    method: 'POST (GET also supported with URL parameters)',
    description: 'Store hash on Cardano blockchain using platform wallet self-send architecture',
    architecture: 'Platform wallet self-send with metadata for cost efficiency',
    authentication: {
      methods: ['Authorization: Bearer {accessToken}'],
      format: 'ak_[16 alphanumeric characters]'
    },
    requiredFields: ['hash'],
    optionalFields: ['metadata', 'formId', 'networkId'],
    getRequestFormat: '/api/storehash?hash={hash}&formId={formId}&networkId={networkId}',
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
  };
  
  return new NextResponse(safeBigIntStringify(infoData), {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

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