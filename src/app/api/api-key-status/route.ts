// src/app/api/api-key-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import dbConnect from '@/lib/mongodb';

interface ApiKeyStatusResponse {
  success: boolean;
  data?: {
    apiKeyId: string;
    adaAmount: number;
    tokenAmount: number;
    remainingTokens: number;
    usedTokens: number;
    isActive: boolean;
    createdAt: string;
    lastUsedAt?: string;
    usagePercentage: number;
    daysActive: number;
  };
  error?: string;
}

/**
 * GET /api/api-key-status
 * 
 * Check API key details and usage statistics
 * Returns: token balance, usage stats, creation date
 * Used for monitoring token consumption
 * 
 * Query parameters:
 * - apiKey: The API key to check (required)
 * 
 * Headers (alternative):
 * - Authorization: Bearer {apiKey}
 * - X-API-Key: {apiKey}
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiKeyStatusResponse>> {
  try {
    console.log('📊 API Key Status - Processing request');

    // Connect to database
    await dbConnect();

    // Extract API key from multiple sources
    const url = new URL(request.url);
    let apiKey = url.searchParams.get('apiKey');

    // If not in query params, check headers
    if (!apiKey) {
      const authHeader = request.headers.get('authorization');
      const apiKeyHeader = request.headers.get('x-api-key');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      } else if (apiKeyHeader) {
        apiKey = apiKeyHeader;
      }
    }

    // Validate API key presence
    if (!apiKey) {
      console.error('❌ No API key provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'API key is required. Provide via query parameter (?apiKey=...) or Authorization header.' 
        },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!/^ak_[a-zA-Z0-9]{16}$/.test(apiKey)) {
      console.error('❌ Invalid API key format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid API key format. Expected format: ak_[16 alphanumeric characters]' 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking status for API key: ${apiKey}`);

    // Get API key status
    const statusResult = await ApiKeyManager.getApiKeyStatus(apiKey);

    if (!statusResult.success) {
      console.error(`❌ Failed to get API key status: ${statusResult.error}`);
      
      // Return 404 for not found, 400 for other client errors
      const statusCode = statusResult.error?.includes('not found') ? 404 : 400;
      
      return NextResponse.json(
        { 
          success: false, 
          error: statusResult.error || 'Failed to retrieve API key status' 
        },
        { status: statusCode }
      );
    }

    const keyData = statusResult.data!;
    
    // Calculate additional metrics
    const usedTokens = keyData.tokenAmount - keyData.remainingTokens;
    const usagePercentage = keyData.tokenAmount > 0 
      ? Math.round((usedTokens / keyData.tokenAmount) * 100) 
      : 0;
    
    const daysActive = Math.ceil(
      (Date.now() - keyData.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`✅ API key status retrieved: ${keyData.remainingTokens}/${keyData.tokenAmount} tokens remaining`);

    // Return detailed status information
    return NextResponse.json({
      success: true,
      data: {
        apiKeyId: keyData.apiKeyId,
        adaAmount: keyData.adaAmount,
        tokenAmount: keyData.tokenAmount,
        remainingTokens: keyData.remainingTokens,
        usedTokens,
        isActive: keyData.isActive,
        createdAt: keyData.createdAt.toISOString(),
        lastUsedAt: keyData.lastUsedAt?.toISOString(),
        usagePercentage,
        daysActive
      }
    });

  } catch (error) {
    console.error('💥 API key status error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while checking API key status',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-key-status
 * 
 * Alternative endpoint that accepts API key in request body
 * Useful for applications that prefer POST over GET with sensitive data
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiKeyStatusResponse>> {
  try {
    console.log('📊 API Key Status (POST) - Processing request');

    // Connect to database
    await dbConnect();

    // Parse request body
    const requestData = await request.json();
    const { apiKey } = requestData;

    // Validate API key presence
    if (!apiKey) {
      console.error('❌ No API key provided in request body');
      return NextResponse.json(
        { 
          success: false, 
          error: 'API key is required in request body' 
        },
        { status: 400 }
      );
    }

    // Create a new request object with the API key as a query parameter
    // and delegate to GET method for consistent processing
    const url = new URL(request.url);
    url.searchParams.set('apiKey', apiKey);
    
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers
    });

    return await GET(getRequest);

  } catch (error) {
    console.error('💥 API key status (POST) error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while checking API key status',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/api-key-status
 * 
 * CORS support for API key status endpoint
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