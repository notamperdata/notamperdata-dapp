// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AccessTokenManager } from '@/lib/AccessTokenManager';
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
  };
  uptime: number;
}

// Store server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Validate access token using real AccessTokenManager
 * Falls back to simple validation for demo keys
 */
async function validateAccessToken(accessToken: string): Promise<{ valid: boolean; message: string }> {
  if (!accessToken) {
    return { valid: false, message: 'No access token provided' };
  }

  // Check for demo/test keys first (for testing)
  if (accessToken === 'demo_key_12345' || accessToken === 'test_key_67890') {
    return { valid: true, message: 'Demo access token accepted' };
  }

  // Use real AccessTokenManager for validation
  try {
    await dbConnect();
    const result = await AccessTokenManager.validateAndConsumeToken(accessToken, 0);
    
    if (result.valid) {
      return { valid: true, message: 'Access token is valid' };
    } else {
      return { valid: false, message: result.error || 'Invalid access token' };
    }
  } catch (error) {
    console.error('Access token validation error:', error);
    
    // Fallback to simple format validation if database is unavailable
    if (accessToken.startsWith('ak_') && accessToken.length >= 20) {
      return { valid: true, message: 'Access token format valid (database unavailable)' };
    }
    
    return { valid: false, message: 'Unable to validate access token' };
  }
}

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

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Extract access token from headers
    const authHeader = request.headers.get('authorization');
    const accessTokenHeader = request.headers.get('x-access-token');
    
    let accessToken: string | null = null;
    
    // Try to extract access token from Authorization header (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    // Fallback to X-access-token header
    else if (accessTokenHeader) {
      accessToken = accessTokenHeader;
    }

    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Validate access token if provided
    let authStatus: { validated: boolean; message: string } | undefined;
    if (accessToken) {
      const validation = await validateAccessToken(accessToken);
      authStatus = {
        validated: validation.valid,
        message: validation.message
      };
    }

    const processingTime = Date.now() - startTime;
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptime: uptime
    };

    // Add authentication status if access token was provided
    if (authStatus) {
      response.authentication = authStatus;
    }

    // Determine response status code
    let statusCode = 200;
    
    // If database is not connected, return 503 (Service Unavailable)
    if (!dbStatus.connected) {
      response.status = 'error';
      statusCode = 503;
    }
    
    // If access token was provided but invalid, return 401 (Unauthorized)
    if (authStatus && !authStatus.validated) {
      statusCode = 401;
    }

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - serverStartTime) / 1000)
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  // POST method for more detailed health checks or authentication testing
  try {
    const body = await request.json().catch(() => ({}));
    const { includeDetailed = false } = body;
    
    // Extract access token
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // For POST, require access token
    if (!accessToken) {
      return NextResponse.json({
        status: 'error',
        message: 'Access token required for detailed health check',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    // Validate access token
    const validation = await validateAccessToken(accessToken);
    if (!validation.valid) {
      return NextResponse.json({
        status: 'error',
        message: validation.message,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }
    
    const dbStatus = await testDatabaseConnection();
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      authentication: {
        validated: true,
        message: validation.message
      },
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      includeDetailed: includeDetailed
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('POST health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}