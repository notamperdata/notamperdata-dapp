/* eslint-disable @typescript-eslint/no-explicit-any */


// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getAccessTokenInfo, getCorsHeaders } from '@/lib/authMiddleware';
import dbConnect from '@/lib/mongodb';

interface HealthResponse {
  status: 'healthy' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  database?: {
    connected: boolean;
    latency?: number;
  };
  authentication?: {
    validated: boolean;
    message: string;
    remainingTokens?: number;
    tokenInfo?: any;
  };
  uptime: number;
  processingTime?: number;
}

// Store server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Test database connectivity
 */
async function testDatabaseConnection(): Promise<{ connected: boolean; latency?: number }> {
  try {
    const startTime = Date.now();
    
    // Try to connect to the database
    await dbConnect();
    
    const latency = Date.now() - startTime;
    return { connected: true, latency };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { connected: false };
  }
}

/**
 * GET /api/health
 * 
 * Health check endpoint with optional access token validation
 * Supports access token in headers or query parameters
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('🏥 Health check - Processing request');

    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Authenticate request (optional - health check should work without auth)
    const authResult = await authenticateRequest(request, {
      required: false, // Auth is optional for health checks
      consumeTokens: 0, // Don't consume tokens for health checks
      allowDemoKeys: true // Allow demo keys for testing
    });

    const processingTime = Date.now() - startTime;
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptime: uptime,
      processingTime: processingTime
    };

    // Add authentication info if access token was provided
    if (authResult.accessToken) {
      if (authResult.success) {
        response.authentication = {
          validated: true,
          message: 'Access token is valid and active',
          remainingTokens: authResult.remainingTokens
        };
        
        // Get detailed token info if needed
        if (authResult.remainingTokens !== undefined) {
          const tokenInfo = await getAccessTokenInfo(request);
          if (tokenInfo.success && tokenInfo.tokenInfo) {
            response.authentication.tokenInfo = {
              remainingTokens: tokenInfo.tokenInfo.remainingTokens,
              tokenAmount: tokenInfo.tokenInfo.tokenAmount,
              usedTokens: tokenInfo.tokenInfo.usedTokens,
              isActive: tokenInfo.tokenInfo.isActive,
              isDemo: tokenInfo.tokenInfo.isDemo || false
            };
          }
        }
      } else {
        response.authentication = {
          validated: false,
          message: authResult.error || 'Access token validation failed'
        };
      }
    }

    // Determine response status code
    let statusCode = 200;
    
    // If database is not connected, return 503 (Service Unavailable)
    if (!dbStatus.connected) {
      response.status = 'error';
      statusCode = 503;
    }
    
    // If access token was provided but invalid, return 401 (Unauthorized)
    if (authResult.accessToken && !authResult.success) {
      statusCode = authResult.statusCode || 401;
    }

    console.log(`✅ Health check completed in ${processingTime}ms`);

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        ...getCorsHeaders(),
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('💥 Health check error:', error);
    
    const processingTime = Date.now() - startTime;
    
    const errorResponse: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      processingTime: processingTime
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

/**
 * POST /api/health
 * 
 * Detailed health check that requires authentication
 * Useful for testing access token validity and getting detailed system info
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    console.log('🏥 Detailed health check - Processing request');

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { includeDetailed = false, testTokenConsumption = false } = body;
    
    // Authenticate request (required for detailed health check)
    const authResult = await authenticateRequest(request, {
      required: true,
      consumeTokens: testTokenConsumption ? 1 : 0, // Optionally test token consumption
      allowDemoKeys: true
    });

    if (!authResult.success) {
      return NextResponse.json({
        status: 'error',
        message: authResult.error,
        timestamp: new Date().toISOString()
      }, { 
        status: authResult.statusCode || 401,
        headers: getCorsHeaders()
      });
    }

    // Perform detailed health checks
    const dbStatus = await testDatabaseConnection();
    
    const processingTime = Date.now() - startTime;
    
    const detailedResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      authentication: {
        validated: true,
        message: 'Access token is valid and active',
        remainingTokens: authResult.remainingTokens,
        tokenConsumed: testTokenConsumption ? 1 : 0
      },
      database: dbStatus,
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      processingTime: processingTime,
      ...(includeDetailed && {
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          pid: process.pid,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        api: {
          rateLimit: 'No limits currently applied',
          supportedMethods: ['GET', 'POST'],
          authMethods: ['Authorization Bearer', 'X-access-token header', 'Request body'],
          endpoints: [
            '/api/health',
            '/api/storehash',
            '/api/verify',
            '/api/access-token-status',
            '/api/generate-api-key'
          ]
        }
      })
    };

    // Get detailed token info
    const tokenInfo = await getAccessTokenInfo(request);
    if (tokenInfo.success && tokenInfo.tokenInfo) {
      detailedResponse.authentication = {
        ...detailedResponse.authentication,
        tokenInfo: tokenInfo.tokenInfo
      };
    }

    console.log(`✅ Detailed health check completed in ${processingTime}ms`);

    return NextResponse.json(detailedResponse, {
      status: dbStatus.connected ? 200 : 503,
      headers: {
        ...getCorsHeaders(),
        'X-Response-Time': `${processingTime}ms`
      }
    });

  } catch (error) {
    console.error('💥 Detailed health check error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error during detailed health check',
      timestamp: new Date().toISOString(),
      processingTime: processingTime
    }, { 
      status: 500,
      headers: {
        ...getCorsHeaders(),
        'X-Response-Time': `${processingTime}ms`
      }
    });
  }
}

/**
 * OPTIONS /api/health
 * 
 * CORS preflight support
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders()
  });
}