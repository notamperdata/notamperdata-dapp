// src/app/api/access-token-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AccessTokenManager } from '@/lib/AccessTokenManager';
import dbConnect from '@/lib/mongodb';

interface accessTokenStatusResponse {
  success: boolean;
  data?: {
    accessTokenId: string;
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
 * GET /api/access-token-status
 * 
 * Check access token details and usage statistics
 * Returns: token balance, usage stats, creation date
 * Used for monitoring token consumption
 * 
 * Query parameters:
 * - accessToken: The access token to check (required)
 * 
 * Headers (alternative):
 * - Authorization: Bearer {accessToken}
 * - X-access-token: {accessToken}
 */
export async function GET(request: NextRequest): Promise<NextResponse<accessTokenStatusResponse>> {
  try {
    console.log('📊 access token Status - Processing request');

    // Connect to database
    await dbConnect();

    // Extract access token from multiple sources
    const url = new URL(request.url);
    let accessToken = url.searchParams.get('accessToken');

    // If not in query params, check headers
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      const accessTokenHeader = request.headers.get('x-access-token');
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      } else if (accessTokenHeader) {
        accessToken = accessTokenHeader;
      }
    }

    // Validate access token presence
    if (!accessToken) {
      console.error('❌ No access token provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'access token is required. Provide via query parameter (?accessToken=...) or Authorization header.' 
        },
        { status: 400 }
      );
    }

    // Validate access token format
    if (!/^ak_[a-zA-Z0-9]{16}$/.test(accessToken)) {
      console.error('❌ Invalid access token format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid access token format. Expected format: ak_[16 alphanumeric characters]' 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking status for access token: ${accessToken}`);

    // Get access token status
    const statusResult = await AccessTokenManager.getAccessTokenStatus(accessToken);

    if (!statusResult.success) {
      console.error(`❌ Failed to get access token status: ${statusResult.error}`);
      
      // Return 404 for not found, 400 for other client errors
      const statusCode = statusResult.error?.includes('not found') ? 404 : 400;
      
      return NextResponse.json(
        { 
          success: false, 
          error: statusResult.error || 'Failed to retrieve access token status' 
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

    console.log(`✅ access token status retrieved: ${keyData.remainingTokens}/${keyData.tokenAmount} tokens remaining`);

    // Return detailed status information
    return NextResponse.json({
      success: true,
      data: {
        accessTokenId: keyData.accessTokenId,
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
    console.error('💥 access token status error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while checking access token status',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/access-token-status
 * 
 * Alternative endpoint that accepts access token in request body
 * Useful for applications that prefer POST over GET with sensitive data
 */
export async function POST(request: NextRequest): Promise<NextResponse<accessTokenStatusResponse>> {
  try {
    console.log('📊 access token Status (POST) - Processing request');

    // Connect to database
    await dbConnect();

    // Parse request body
    const requestData = await request.json();
    const { accessToken } = requestData;

    // Validate access token presence
    if (!accessToken) {
      console.error('❌ No access token provided in request body');
      return NextResponse.json(
        { 
          success: false, 
          error: 'access token is required in request body' 
        },
        { status: 400 }
      );
    }

    // Create a new request object with the access token as a query parameter
    // and delegate to GET method for consistent processing
    const url = new URL(request.url);
    url.searchParams.set('accessToken', accessToken);
    
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers
    });

    return await GET(getRequest);

  } catch (error) {
    console.error('💥 access token status (POST) error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error while checking access token status',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/access-token-status
 * 
 * CORS support for access token status endpoint
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